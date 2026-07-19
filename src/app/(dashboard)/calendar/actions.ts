"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { eventSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export async function saveEventAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("events.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = eventSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    type: formData.get("type"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt") ?? "",
    location: formData.get("location") ?? "",
    caseId: formData.get("caseId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const start = new Date(parsed.data.startAt);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "تاريخ غير صالح" };
  }
  const end = parsed.data.endAt ? new Date(parsed.data.endAt) : null;

  const data = {
    title: parsed.data.title,
    type: parsed.data.type,
    startAt: start,
    endAt: end,
    location: parsed.data.location || null,
    caseId: parsed.data.caseId || null,
    notes: parsed.data.notes || null,
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.event.update({ where: { id: parsed.data.id }, data });
    await audit({
      action: "event.update",
      userId: actor.id,
      entity: "Event",
      entityId: parsed.data.id,
      ip,
    });
  } else {
    const created = await prisma.event.create({
      data: { ...data, createdById: actor.id },
    });
    await audit({
      action: "event.create",
      userId: actor.id,
      entity: "Event",
      entityId: created.id,
      ip,
    });
    // إشعار العميل بالبريد عند إضافة موعد/جلسة جديدة على قضيته.
    if (data.caseId) {
      await notifyClientCaseUpdate(data.caseId, {
        subject: `موعد جديد على قضيتك: ${data.title}`,
        heading: "تمت إضافة موعد جديد",
        lines: [
          `${EVENT_TYPE_LABELS[data.type] ?? "موعد"}: ${data.title}`,
          `التاريخ: ${formatDateTime(data.startAt)}`,
          ...(data.location ? [`المكان: ${data.location}`] : []),
        ],
      });
    }
  }

  revalidatePath("/calendar");
  return { ok: true, success: parsed.data.id ? "تم حفظ الموعد" : "تمت إضافة الموعد" };
}

export async function deleteEventAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("events.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  await prisma.event.delete({ where: { id } });
  await audit({
    action: "event.delete",
    userId: actor.id,
    entity: "Event",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/calendar");
  return { ok: true, success: "تم حذف الموعد" };
}
