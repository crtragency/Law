"use server";

import { revalidatePath } from "next/cache";
import { AuthError, ensurePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { nullIfEmpty } from "@/lib/action-form";
import { notify, notifyMany } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { approvalDecisionSchema, approvalRequestSchema } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const EMPTY_MESSAGE = "طلب غير صالح";

export async function createApprovalRequestAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: EMPTY_MESSAGE };
  let actor;
  try {
    actor = await ensurePermission("approvals.view");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = approvalRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات الموافقة غير صحيحة" };
  }

  const request = await prisma.approvalRequest.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      entityType: nullIfEmpty(parsed.data.entityType),
      entityId: nullIfEmpty(parsed.data.entityId),
      reason: nullIfEmpty(parsed.data.reason),
      requestedById: actor.id,
    },
  });

  const approvers = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "LAWYER"] } },
    select: { id: true },
  });
  await notifyMany(
    approvers.map((user) => user.id).filter((id) => id !== actor.id),
    {
      type: "approval.requested",
      title: "طلب موافقة جديد",
      body: request.title,
      link: "/approvals",
    }
  );
  await audit({
    action: "approval.request",
    userId: actor.id,
    entity: "ApprovalRequest",
    entityId: request.id,
    ip: await getClientIp(),
  });

  revalidatePath("/approvals");
  revalidatePath("/notifications");
  return { ok: true, success: "تم إرسال طلب الموافقة" };
}

export async function createApprovalRequestFormAction(formData: FormData): Promise<void> {
  await createApprovalRequestAction({ ok: false }, formData);
}

export async function decideApprovalRequestAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: EMPTY_MESSAGE };
  let actor;
  try {
    actor = await ensurePermission("approvals.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = approvalDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "قرار الموافقة غير صحيح" };
  }

  const before = await prisma.approvalRequest.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, title: true, requestedById: true, status: true },
  });
  if (!before) return { ok: false, error: "طلب الموافقة غير موجود" };
  if (before.status !== "PENDING") return { ok: false, error: "تم التعامل مع هذا الطلب بالفعل" };

  const request = await prisma.approvalRequest.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      decisionNote: nullIfEmpty(parsed.data.decisionNote),
      decidedById: actor.id,
      decidedAt: new Date(),
    },
  });

  if (before.requestedById && before.requestedById !== actor.id) {
    await notify({
      userId: before.requestedById,
      type: "approval.decided",
      title: request.status === "APPROVED" ? "تم اعتماد طلبك" : "تم تحديث طلب الموافقة",
      body: request.title,
      link: "/approvals",
    });
  }
  await audit({
    action: "approval.decide",
    userId: actor.id,
    entity: "ApprovalRequest",
    entityId: request.id,
    ip: await getClientIp(),
    details: { status: request.status },
  });

  revalidatePath("/approvals");
  revalidatePath("/notifications");
  return { ok: true, success: "تم حفظ القرار" };
}

export async function decideApprovalRequestFormAction(formData: FormData): Promise<void> {
  await decideApprovalRequestAction({ ok: false }, formData);
}
