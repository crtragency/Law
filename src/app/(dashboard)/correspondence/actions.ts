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

const correspondenceSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  number: z.string().trim().min(2, "رقم القيد مطلوب").max(80),
  title: z.string().trim().min(2, "عنوان المراسلة مطلوب").max(220),
  direction: z.enum(["INCOMING", "OUTGOING"]),
  status: z.enum(["DRAFT", "REGISTERED", "SENT", "RECEIVED", "ARCHIVED"]),
  importance: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  sender: z.string().trim().max(180).optional().or(z.literal("")),
  recipient: z.string().trim().max(180).optional().or(z.literal("")),
  deliveryMethod: z.string().trim().max(120).optional().or(z.literal("")),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
  summary: z.string().trim().max(2500).optional().or(z.literal("")),
  attachmentUrl: z.string().trim().max(800).optional().or(z.literal("")),
  receivedAt: z.string().optional().or(z.literal("")),
  sentAt: z.string().optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
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

export async function saveCorrespondenceAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = correspondenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات المراسلة" };
  }

  const receivedAt = dateOrNull(parsed.data.receivedAt);
  const sentAt = dateOrNull(parsed.data.sentAt);
  const dueAt = dateOrNull(parsed.data.dueAt);
  if (parsed.data.receivedAt && !receivedAt) return { ok: false, error: "تاريخ الاستلام غير صحيح" };
  if (parsed.data.sentAt && !sentAt) return { ok: false, error: "تاريخ الإرسال غير صحيح" };
  if (parsed.data.dueAt && !dueAt) return { ok: false, error: "موعد الرد غير صحيح" };

  const data = {
    number: parsed.data.number,
    title: parsed.data.title,
    direction: parsed.data.direction,
    status: parsed.data.status,
    importance: parsed.data.importance,
    sender: nullIfEmpty(parsed.data.sender),
    recipient: nullIfEmpty(parsed.data.recipient),
    deliveryMethod: nullIfEmpty(parsed.data.deliveryMethod),
    referenceNumber: nullIfEmpty(parsed.data.referenceNumber),
    summary: nullIfEmpty(parsed.data.summary),
    attachmentUrl: nullIfEmpty(parsed.data.attachmentUrl),
    receivedAt,
    sentAt,
    dueAt,
    clientId: nullIfEmpty(parsed.data.clientId),
    caseId: nullIfEmpty(parsed.data.caseId),
    assignedToId: nullIfEmpty(parsed.data.assignedToId),
    notes: nullIfEmpty(parsed.data.notes),
  };

  const ip = await getClientIp();
  try {
    if (parsed.data.id) {
      await prisma.correspondenceRegister.update({ where: { id: parsed.data.id }, data });
      await audit({ action: "correspondence.update", userId: actor.id, entity: "CorrespondenceRegister", entityId: parsed.data.id, ip });
    } else {
      const created = await prisma.correspondenceRegister.create({ data: { ...data, createdById: actor.id } });
      await audit({ action: "correspondence.create", userId: actor.id, entity: "CorrespondenceRegister", entityId: created.id, ip });
      if (dueAt) {
        const task = await prisma.task.create({
          data: {
            title: `رد على مراسلة: ${parsed.data.title}`,
            description: parsed.data.summary || parsed.data.notes || parsed.data.title,
            status: "TODO",
            priority: parsed.data.importance === "URGENT" ? "URGENT" : parsed.data.importance === "IMPORTANT" ? "HIGH" : "MEDIUM",
            dueDate: dueAt,
            caseId: data.caseId,
            assignedToId: data.assignedToId ?? actor.id,
            createdById: actor.id,
          },
        });
        if (task.assignedToId && task.assignedToId !== actor.id) {
          await notify({
            userId: task.assignedToId,
            type: "correspondence.due",
            title: "موعد رد على مراسلة",
            body: `${actor.name}: ${parsed.data.title}`,
            link: "/tasks",
          });
        }
      }
    }
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, error: "رقم القيد مستخدم بالفعل" };
    }
    throw e;
  }

  revalidatePath("/correspondence");
  if (data.caseId) revalidatePath(`/cases/${data.caseId}`);
  return { ok: true, success: parsed.data.id ? "تم حفظ المراسلة" : "تم قيد المراسلة" };
}

export async function deleteCorrespondenceAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرف غير صالح" };
  const item = await prisma.correspondenceRegister.findUnique({ where: { id }, select: { caseId: true } });
  await prisma.correspondenceRegister.delete({ where: { id } });
  await audit({ action: "correspondence.delete", userId: actor.id, entity: "CorrespondenceRegister", entityId: id, ip: await getClientIp() });
  revalidatePath("/correspondence");
  if (item?.caseId) revalidatePath(`/cases/${item.caseId}`);
  return { ok: true, success: "تم حذف المراسلة" };
}
