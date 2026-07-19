"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { clientSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export async function saveClientAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };

  let actor;
  try {
    actor = await ensurePermission("clients.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = clientSchema.safeParse({
    id: formData.get("id") || undefined,
    type: formData.get("type") || "INDIVIDUAL",
    name: formData.get("name"),
    nationalId: formData.get("nationalId") ?? "",
    nationality: formData.get("nationality") ?? "",
    companyName: formData.get("companyName") ?? "",
    unifiedNumber: formData.get("unifiedNumber") ?? "",
    taxNumber: formData.get("taxNumber") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    type: parsed.data.type,
    name: parsed.data.name,
    nationalId: parsed.data.nationalId || null,
    nationality: parsed.data.nationality || null,
    companyName: parsed.data.type === "COMPANY" ? parsed.data.companyName || null : null,
    unifiedNumber: parsed.data.type === "COMPANY" ? parsed.data.unifiedNumber || null : null,
    taxNumber: parsed.data.type === "COMPANY" ? parsed.data.taxNumber || null : null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null,
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.client.update({ where: { id: parsed.data.id }, data });
    await audit({
      action: "client.update",
      userId: actor.id,
      entity: "Client",
      entityId: parsed.data.id,
      ip,
    });
  } else {
    const created = await prisma.client.create({
      data: { ...data, createdById: actor.id },
    });
    await audit({
      action: "client.create",
      userId: actor.id,
      entity: "Client",
      entityId: created.id,
      ip,
    });
  }

  revalidatePath("/clients");
  return { ok: true, success: parsed.data.id ? "تم حفظ التعديلات" : "تمت إضافة الموكّل" };
}

export async function deleteClientAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };

  let actor;
  try {
    actor = await ensurePermission("clients.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  // لا نحذف موكّلاً له قضايا (حماية للبيانات).
  const caseCount = await prisma.case.count({ where: { clientId: id } });
  if (caseCount > 0) {
    return {
      ok: false,
      error: "لا يمكن حذف موكّل مرتبط بقضايا. احذف قضاياه أولاً أو أرشفها",
    };
  }

  await prisma.client.delete({ where: { id } });
  await audit({
    action: "client.delete",
    userId: actor.id,
    entity: "Client",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/clients");
  return { ok: true, success: "تم حذف الموكّل" };
}
