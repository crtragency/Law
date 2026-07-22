"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import { notify } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { DOCUMENT_REQUEST_STATUS_LABELS, formatDate } from "@/lib/labels";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const requestSchema = z.object({
  caseId: z.string().min(1, "اختر القضية"),
  title: z.string().trim().min(1, "اسم المستند مطلوب").max(200),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});

const statusSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  status: z.enum(["REQUESTED", "RECEIVED", "WAIVED"]),
});

async function guard(): Promise<{ id: string; name: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("documents.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createDocumentRequestCenterAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات طلب المستند" };
  }

  const dueDate = dateOrNull(parsed.data.dueDate);
  if (parsed.data.dueDate && !dueDate) return { ok: false, error: "تاريخ الاستحقاق غير صحيح" };

  const caseInfo = await prisma.case.findUnique({
    where: { id: parsed.data.caseId },
    select: { id: true, title: true, caseNumber: true },
  });
  if (!caseInfo) return { ok: false, error: "القضية غير موجودة" };

  const request = await prisma.documentRequest.create({
    data: {
      caseId: caseInfo.id,
      title: parsed.data.title,
      category: nullIfEmpty(parsed.data.category),
      description: nullIfEmpty(parsed.data.description),
      dueDate,
      createdById: actor.id,
    },
  });

  await audit({
    action: "document.request.center.create",
    userId: actor.id,
    entity: "DocumentRequest",
    entityId: request.id,
    ip: await getClientIp(),
    details: { caseId: caseInfo.id },
  });

  if (dueDate) {
    const task = await prisma.task.create({
      data: {
        title: `متابعة مستند مطلوب: ${parsed.data.title}`,
        description: parsed.data.description || `القضية ${caseInfo.caseNumber}`,
        status: "TODO",
        priority: "MEDIUM",
        dueDate,
        caseId: caseInfo.id,
        assignedToId: nullIfEmpty(parsed.data.assignedToId) ?? actor.id,
        createdById: actor.id,
      },
    });
    if (task.assignedToId && task.assignedToId !== actor.id) {
      await notify({
        userId: task.assignedToId,
        type: "document.request.followup",
        title: "متابعة مستند مطلوب",
        body: `${actor.name}: ${parsed.data.title}`,
        link: "/document-requests",
      });
    }
  }

  await notifyClientCaseUpdate(caseInfo.id, {
    subject: `مستند مطلوب: ${parsed.data.title}`,
    heading: "المكتب يحتاج مستنداً منك",
    lines: [
      `القضية: ${caseInfo.title} (${caseInfo.caseNumber})`,
      `المستند: ${parsed.data.title}`,
      ...(parsed.data.category ? [`التصنيف: ${parsed.data.category}`] : []),
      ...(dueDate ? [`آخر موعد للإرسال: ${formatDate(dueDate)}`] : []),
      ...(parsed.data.description ? [parsed.data.description] : []),
    ],
  });

  revalidatePath("/document-requests");
  revalidatePath(`/cases/${caseInfo.id}`);
  revalidatePath(`/portal/cases/${caseInfo.id}`);
  revalidatePath("/tasks");
  return { ok: true, success: "تم طلب المستند من العميل" };
}

export async function updateDocumentRequestCenterStatusAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "حالة الطلب غير صحيحة" };

  await prisma.documentRequest.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  await audit({
    action: "document.request.center.status",
    userId: actor.id,
    entity: "DocumentRequest",
    entityId: parsed.data.id,
    ip: await getClientIp(),
    details: { status: parsed.data.status },
  });

  revalidatePath("/document-requests");
  revalidatePath(`/cases/${parsed.data.caseId}`);
  revalidatePath(`/portal/cases/${parsed.data.caseId}`);
  return { ok: true, success: `تم تحديث الطلب إلى ${DOCUMENT_REQUEST_STATUS_LABELS[parsed.data.status]}` };
}

export async function deleteDocumentRequestCenterAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرف غير صالح" };
  const request = await prisma.documentRequest.findUnique({ where: { id }, select: { caseId: true } });
  await prisma.documentRequest.delete({ where: { id } });
  await audit({ action: "document.request.center.delete", userId: actor.id, entity: "DocumentRequest", entityId: id, ip: await getClientIp() });
  revalidatePath("/document-requests");
  if (request?.caseId) revalidatePath(`/cases/${request.caseId}`);
  return { ok: true, success: "تم حذف طلب المستند" };
}
