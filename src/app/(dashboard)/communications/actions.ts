"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { notify } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const communicationSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  subject: z.string().trim().min(2, "اكتب عنوان المتابعة").max(220),
  direction: z.enum(["INBOUND", "OUTBOUND", "INTERNAL"]),
  channel: z.enum(["PHONE", "EMAIL", "WHATSAPP", "SMS", "MEETING", "PORTAL", "OTHER"]),
  outcome: z.enum(["LOGGED", "NEEDS_FOLLOWUP", "FOLLOWED_UP", "CLOSED"]),
  summary: z.string().trim().min(3, "اكتب ملخص التواصل").max(3000),
  contactName: z.string().trim().max(160).optional().or(z.literal("")),
  contactInfo: z.string().trim().max(180).optional().or(z.literal("")),
  occurredAt: z.string().min(1, "حدد وقت التواصل"),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

async function guard(): Promise<{ id: string; name: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("cases.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveCommunicationAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = communicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات التواصل" };
  }

  const occurredAt = dateOrNull(parsed.data.occurredAt);
  const nextFollowUpAt = dateOrNull(parsed.data.nextFollowUpAt);
  if (!occurredAt) return { ok: false, error: "وقت التواصل غير صحيح" };
  if (parsed.data.nextFollowUpAt && !nextFollowUpAt) return { ok: false, error: "موعد المتابعة غير صحيح" };

  const data = {
    subject: parsed.data.subject,
    direction: parsed.data.direction,
    channel: parsed.data.channel,
    outcome: parsed.data.outcome,
    summary: parsed.data.summary,
    contactName: nullIfEmpty(parsed.data.contactName),
    contactInfo: nullIfEmpty(parsed.data.contactInfo),
    occurredAt,
    nextFollowUpAt,
    clientId: nullIfEmpty(parsed.data.clientId),
    caseId: nullIfEmpty(parsed.data.caseId),
    assignedToId: nullIfEmpty(parsed.data.assignedToId),
    notes: nullIfEmpty(parsed.data.notes),
  };

  const ip = await getClientIp();
  let id = parsed.data.id;
  if (id) {
    await prisma.communicationLog.update({ where: { id }, data });
    await audit({ action: "communication.update", userId: actor.id, entity: "CommunicationLog", entityId: id, ip });
  } else {
    const created = await prisma.communicationLog.create({ data: { ...data, createdById: actor.id } });
    id = created.id;
    await audit({ action: "communication.create", userId: actor.id, entity: "CommunicationLog", entityId: id, ip });
  }

  if (!parsed.data.id && (nextFollowUpAt || parsed.data.outcome === "NEEDS_FOLLOWUP")) {
    const task = await prisma.task.create({
      data: {
        title: `متابعة تواصل: ${parsed.data.subject}`,
        description: parsed.data.summary,
        status: "TODO",
        priority: parsed.data.outcome === "NEEDS_FOLLOWUP" ? "HIGH" : "MEDIUM",
        dueDate: nextFollowUpAt ?? new Date(),
        caseId: data.caseId,
        assignedToId: data.assignedToId ?? actor.id,
        createdById: actor.id,
      },
    });
    await prisma.communicationLog.update({ where: { id }, data: { generatedTaskId: task.id } });
    if (task.assignedToId && task.assignedToId !== actor.id) {
      await notify({
        userId: task.assignedToId,
        type: "communication.followup",
        title: "متابعة تواصل جديدة",
        body: `${actor.name}: ${parsed.data.subject}`,
        link: "/tasks",
      });
    }
  }

  revalidatePath("/communications");
  if (data.caseId) revalidatePath(`/cases/${data.caseId}`);
  return { ok: true, success: parsed.data.id ? "تم حفظ التواصل" : "تم تسجيل التواصل" };
}

export async function deleteCommunicationAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرف غير صالح" };
  const item = await prisma.communicationLog.findUnique({ where: { id }, select: { caseId: true } });
  await prisma.communicationLog.delete({ where: { id } });
  await audit({ action: "communication.delete", userId: actor.id, entity: "CommunicationLog", entityId: id, ip: await getClientIp() });
  revalidatePath("/communications");
  if (item?.caseId) revalidatePath(`/cases/${item.caseId}`);
  return { ok: true, success: "تم حذف التواصل" };
}
