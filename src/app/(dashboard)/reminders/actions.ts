"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { reminderSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("reminders.manage");
    return { id: user.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveReminderAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = reminderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }
  const dueAt = dateOrNull(parsed.data.dueAt);
  if (!dueAt) return { ok: false, error: "موعد التنبيه غير صالح" };

  const data = {
    type: parsed.data.type,
    status: parsed.data.status,
    title: parsed.data.title,
    dueAt,
    link: nullIfEmpty(parsed.data.link),
    notes: nullIfEmpty(parsed.data.notes),
    userId: nullIfEmpty(parsed.data.userId),
    clientId: nullIfEmpty(parsed.data.clientId),
    caseId: nullIfEmpty(parsed.data.caseId),
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.reminder.update({ where: { id: parsed.data.id }, data });
    await audit({ action: "reminder.update", userId: actor.id, entity: "Reminder", entityId: parsed.data.id, ip });
  } else {
    const created = await prisma.reminder.create({ data: { ...data, createdById: actor.id } });
    await audit({ action: "reminder.create", userId: actor.id, entity: "Reminder", entityId: created.id, ip });
  }
  revalidatePath("/reminders");
  return { ok: true, success: "تم حفظ التنبيه" };
}

export async function saveReminderFormAction(formData: FormData): Promise<void> {
  await saveReminderAction(formData);
}

export async function completeReminderAction(formData: FormData) {
  const actor = await guard();
  if ("ok" in actor) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.reminder.update({ where: { id }, data: { status: "DONE" } });
  await audit({ action: "reminder.done", userId: actor.id, entity: "Reminder", entityId: id, ip: await getClientIp() });
  revalidatePath("/reminders");
}
