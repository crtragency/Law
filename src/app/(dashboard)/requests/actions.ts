"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, ensurePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { workDateFromKey } from "@/lib/attendance";
import { EMPLOYEE_REQUEST_TYPE_LABELS } from "@/lib/employee-requests";
import { hasPermission } from "@/lib/rbac";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const EMPTY_RESULT: ActionResult = { ok: false };

const requestSchema = z.object({
  type: z.enum(["LEAVE", "LATE_PERMISSION", "EARLY_LEAVE_PERMISSION", "REMOTE_WORK", "GENERAL"]),
  subject: z.string().trim().min(3, "اكتب عنوان واضح للطلب").max(160),
  reason: z.string().trim().min(5, "اكتب سبب الطلب").max(1200),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

const decisionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(800).optional().or(z.literal("")),
});

function parseRequestDate(value?: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return workDateFromKey(value);
}

export async function createEmployeeRequestAction(
  _prev: ActionResult = EMPTY_RESULT,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  const user = await requireUser();
  const parsed = requestSchema.safeParse({
    type: formData.get("type"),
    subject: formData.get("subject"),
    reason: formData.get("reason"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات الطلب غير صحيحة" };
  }

  const needsDate = parsed.data.type !== "GENERAL";
  const startDate = parseRequestDate(parsed.data.startDate);
  const endDate = parseRequestDate(parsed.data.endDate) ?? startDate;
  if (needsDate && !startDate) {
    return { ok: false, error: "اختر تاريخ الطلب" };
  }
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" };
  }

  const request = await prisma.employeeRequest.create({
    data: {
      requestedById: user.id,
      type: parsed.data.type,
      subject: parsed.data.subject,
      reason: parsed.data.reason,
      startDate,
      endDate,
    },
  });

  const managers = await prisma.user.findMany({
    where: { isActive: true, id: { not: user.id } },
    select: { id: true, role: true, permissionOverridesJson: true },
  });
  await notifyMany(
    managers
      .filter((manager) => hasPermission(manager, "employeeRequests.manage"))
      .map((manager) => manager.id),
    {
      type: "employee.request",
      title: "طلب موظف جديد",
      body: `${user.name}: ${EMPLOYEE_REQUEST_TYPE_LABELS[parsed.data.type]} - ${parsed.data.subject}`,
      link: "/requests",
    }
  );

  await audit({
    action: "employee_request.create",
    userId: user.id,
    entity: "EmployeeRequest",
    entityId: request.id,
    ip: await getClientIp(),
    details: { type: request.type },
  });
  revalidatePath("/requests");
  return { ok: true, success: "تم إرسال الطلب للإدارة" };
}

export async function decideEmployeeRequestAction(
  _prev: ActionResult = EMPTY_RESULT,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let manager;
  try {
    manager = await ensurePermission("employeeRequests.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = decisionSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    decisionNote: formData.get("decisionNote") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "قرار غير صالح" };
  }

  const request = await prisma.employeeRequest.findUnique({
    where: { id: parsed.data.id },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
  if (!request) return { ok: false, error: "الطلب غير موجود" };
  if (request.status !== "PENDING") return { ok: false, error: "تم اتخاذ قرار على هذا الطلب بالفعل" };

  const updated = await prisma.employeeRequest.update({
    where: { id: request.id },
    data: {
      status: parsed.data.status,
      decisionNote: parsed.data.decisionNote || null,
      decidedAt: new Date(),
      decidedById: manager.id,
    },
  });

  await notify({
    userId: request.requestedById,
    type: "employee.request.decision",
    title: parsed.data.status === "APPROVED" ? "تمت الموافقة على طلبك" : "تم رفض طلبك",
    body: `${EMPLOYEE_REQUEST_TYPE_LABELS[request.type]} - ${request.subject}`,
    link: "/requests",
  });
  await audit({
    action: "employee_request.decision",
    userId: manager.id,
    entity: "EmployeeRequest",
    entityId: request.id,
    ip: await getClientIp(),
    details: { status: updated.status },
  });

  revalidatePath("/requests");
  revalidatePath("/attendance");
  return { ok: true, success: "تم حفظ القرار" };
}

export async function cancelEmployeeRequestAction(
  _prev: ActionResult = EMPTY_RESULT,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "طلب غير صالح" };

  const updated = await prisma.employeeRequest.updateMany({
    where: { id, requestedById: user.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) return { ok: false, error: "لا يمكن إلغاء هذا الطلب" };

  await audit({
    action: "employee_request.cancel",
    userId: user.id,
    entity: "EmployeeRequest",
    entityId: id,
    ip: await getClientIp(),
  });
  revalidatePath("/requests");
  return { ok: true, success: "تم إلغاء الطلب" };
}
