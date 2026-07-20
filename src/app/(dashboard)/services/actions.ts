"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { serviceRequestSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const EMPTY_TO_NULL = (value: string | undefined | null) => value || null;

async function guard(): Promise<{ id: string; name: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const actor = await ensurePermission("services.manage");
    return { id: actor.id, name: actor.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveServiceRequestAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = serviceRequestSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    serviceArea: formData.get("serviceArea"),
    status: formData.get("status") || "NEW",
    priority: formData.get("priority") || "MEDIUM",
    description: formData.get("description") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    clientId: formData.get("clientId") ?? "",
    caseId: formData.get("caseId") ?? "",
    assignedToId: formData.get("assignedToId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return { ok: false, error: "تاريخ غير صالح" };
  }

  if (parsed.data.caseId && parsed.data.clientId) {
    const caseMatchesClient = await prisma.case.findFirst({
      where: { id: parsed.data.caseId, clientId: parsed.data.clientId },
      select: { id: true },
    });
    if (!caseMatchesClient) {
      return { ok: false, error: "القضية المختارة لا تخص هذا الموكّل" };
    }
  }

  const data = {
    title: parsed.data.title,
    serviceArea: parsed.data.serviceArea,
    status: parsed.data.status,
    priority: parsed.data.priority,
    description: parsed.data.description || null,
    dueDate,
    clientId: EMPTY_TO_NULL(parsed.data.clientId),
    caseId: EMPTY_TO_NULL(parsed.data.caseId),
    assignedToId: EMPTY_TO_NULL(parsed.data.assignedToId),
  };

  const ip = await getClientIp();
  let requestId = parsed.data.id;

  if (requestId) {
    await prisma.serviceRequest.update({ where: { id: requestId }, data });
    await audit({
      action: "service.update",
      userId: actor.id,
      entity: "ServiceRequest",
      entityId: requestId,
      ip,
      details: { serviceArea: data.serviceArea, status: data.status },
    });
  } else {
    const created = await prisma.serviceRequest.create({
      data: { ...data, createdById: actor.id },
    });
    requestId = created.id;
    await audit({
      action: "service.create",
      userId: actor.id,
      entity: "ServiceRequest",
      entityId: created.id,
      ip,
      details: { serviceArea: data.serviceArea, status: data.status },
    });
  }

  if (data.assignedToId && data.assignedToId !== actor.id) {
    await notify({
      userId: data.assignedToId,
      type: "service.assigned",
      title: "تم إسناد طلب خدمة إليك",
      body: `${actor.name}: ${parsed.data.title}`,
      link: "/services",
    });
  }

  revalidatePath("/services");
  return { ok: true, success: parsed.data.id ? "تم حفظ طلب الخدمة" : "تم إنشاء طلب الخدمة" };
}

export async function updateServiceRequestStatusAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const valid = ["NEW", "IN_REVIEW", "IN_PROGRESS", "WAITING_CLIENT", "COMPLETED", "CANCELLED"];
  if (!id || !valid.includes(status)) {
    return { ok: false, error: "قيمة غير صالحة" };
  }

  await prisma.serviceRequest.update({
    where: { id },
    data: { status: status as "NEW" | "IN_REVIEW" | "IN_PROGRESS" | "WAITING_CLIENT" | "COMPLETED" | "CANCELLED" },
  });

  await audit({
    action: "service.status",
    userId: actor.id,
    entity: "ServiceRequest",
    entityId: id,
    ip: await getClientIp(),
    details: { status },
  });

  revalidatePath("/services");
  return { ok: true, success: "تم تحديث الحالة" };
}

export async function deleteServiceRequestAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  await prisma.serviceRequest.delete({ where: { id } });
  await audit({
    action: "service.delete",
    userId: actor.id,
    entity: "ServiceRequest",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/services");
  return { ok: true, success: "تم حذف طلب الخدمة" };
}