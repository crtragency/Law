"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { legalContactSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { nullIfEmpty, caseBelongsToClient } from "@/lib/action-form";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("contacts.manage");
    return { id: user.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveContactAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = legalContactSchema.safeParse({
    id: formData.get("id") || undefined,
    type: formData.get("type") || "OTHER",
    name: formData.get("name"),
    organization: formData.get("organization") ?? "",
    roleTitle: formData.get("roleTitle") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
    clientId: formData.get("clientId") ?? "",
    caseId: formData.get("caseId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  if (!(await caseBelongsToClient(parsed.data.caseId, parsed.data.clientId))) {
    return { ok: false, error: "القضية المختارة لا تخص هذا الموكّل" };
  }

  const data = {
    type: parsed.data.type,
    name: parsed.data.name,
    organization: nullIfEmpty(parsed.data.organization),
    roleTitle: nullIfEmpty(parsed.data.roleTitle),
    phone: nullIfEmpty(parsed.data.phone),
    email: nullIfEmpty(parsed.data.email),
    address: nullIfEmpty(parsed.data.address),
    notes: nullIfEmpty(parsed.data.notes),
    clientId: nullIfEmpty(parsed.data.clientId),
    caseId: nullIfEmpty(parsed.data.caseId),
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.legalContact.update({ where: { id: parsed.data.id }, data });
    await audit({
      action: "contact.update",
      userId: actor.id,
      entity: "LegalContact",
      entityId: parsed.data.id,
      ip,
    });
  } else {
    const created = await prisma.legalContact.create({
      data: { ...data, createdById: actor.id },
    });
    await audit({
      action: "contact.create",
      userId: actor.id,
      entity: "LegalContact",
      entityId: created.id,
      ip,
    });
  }

  revalidatePath("/contacts");
  return { ok: true, success: parsed.data.id ? "تم حفظ الجهة" : "تمت إضافة الجهة" };
}

export async function deleteContactAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  await prisma.legalContact.delete({ where: { id } });
  await audit({
    action: "contact.delete",
    userId: actor.id,
    entity: "LegalContact",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/contacts");
  return { ok: true, success: "تم حذف الجهة" };
}
