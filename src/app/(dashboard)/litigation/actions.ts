"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { litigationStepSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { notify } from "@/lib/notifications";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import {
  LITIGATION_STAGE_LABELS,
  LITIGATION_STEP_STATUS_LABELS,
  formatDate,
} from "@/lib/labels";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string; name: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("litigation.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveLitigationStepAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = litigationStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    title: parsed.data.title,
    stage: parsed.data.stage,
    status: parsed.data.status,
    priority: parsed.data.priority,
    court: nullIfEmpty(parsed.data.court),
    circuit: nullIfEmpty(parsed.data.circuit),
    sessionDate: dateOrNull(parsed.data.sessionDate),
    dueDate: dateOrNull(parsed.data.dueDate),
    outcome: nullIfEmpty(parsed.data.outcome),
    nextAction: nullIfEmpty(parsed.data.nextAction),
    notes: nullIfEmpty(parsed.data.notes),
    caseId: parsed.data.caseId,
    assignedToId: nullIfEmpty(parsed.data.assignedToId),
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.litigationStep.update({ where: { id: parsed.data.id }, data });
    await audit({ action: "litigation.update", userId: actor.id, entity: "LitigationStep", entityId: parsed.data.id, ip });
  } else {
    const created = await prisma.litigationStep.create({ data: { ...data, createdById: actor.id } });
    await audit({ action: "litigation.create", userId: actor.id, entity: "LitigationStep", entityId: created.id, ip });
  }
  if (data.assignedToId && data.assignedToId !== actor.id) {
    await notify({
      userId: data.assignedToId,
      type: "litigation.assigned",
      title: "تم إسناد إجراء تقاضي إليك",
      body: `${actor.name}: ${data.title}`,
      link: "/litigation",
    });
  }
  await notifyClientCaseUpdate(data.caseId, {
    subject: `تحديث إجراء تقاضي: ${data.title}`,
    heading: parsed.data.id ? "تم تحديث إجراء تقاضي في قضيتك" : "تمت إضافة إجراء تقاضي لقضيتك",
    lines: [
      `الإجراء: ${data.title}`,
      `المرحلة: ${LITIGATION_STAGE_LABELS[data.stage] ?? data.stage}`,
      `الحالة: ${LITIGATION_STEP_STATUS_LABELS[data.status] ?? data.status}`,
      ...(data.sessionDate ? [`تاريخ الجلسة: ${formatDate(data.sessionDate)}`] : []),
      ...(data.dueDate ? [`تاريخ الاستحقاق: ${formatDate(data.dueDate)}`] : []),
      ...(data.outcome ? [`النتيجة: ${data.outcome}`] : []),
      ...(data.nextAction ? [`الإجراء التالي: ${data.nextAction}`] : []),
    ],
  });

  revalidatePath("/litigation");
  return { ok: true, success: "تم حفظ إجراء التقاضي" };
}

export async function saveLitigationStepFormAction(formData: FormData): Promise<void> {
  await saveLitigationStepAction(formData);
}

export async function deleteLitigationStepAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };
  await prisma.litigationStep.delete({ where: { id } });
  await audit({ action: "litigation.delete", userId: actor.id, entity: "LitigationStep", entityId: id, ip: await getClientIp() });
  revalidatePath("/litigation");
  return { ok: true, success: "تم حذف الإجراء" };
}

export async function deleteLitigationStepFormAction(formData: FormData): Promise<void> {
  await deleteLitigationStepAction(formData);
}
