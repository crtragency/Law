"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { powerOfAttorneySchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { caseBelongsToClient, dateOrNull, nullIfEmpty } from "@/lib/action-form";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("powers.manage");
    return { id: user.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function savePowerAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = powerOfAttorneySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  if (!(await caseBelongsToClient(parsed.data.caseId, parsed.data.clientId))) {
    return { ok: false, error: "القضية المختارة لا تخص هذا الموكّل" };
  }

  const data = {
    number: parsed.data.number,
    title: parsed.data.title,
    status: parsed.data.status,
    issuedAt: dateOrNull(parsed.data.issuedAt),
    expiresAt: dateOrNull(parsed.data.expiresAt),
    issuer: nullIfEmpty(parsed.data.issuer),
    representative: nullIfEmpty(parsed.data.representative),
    scope: nullIfEmpty(parsed.data.scope),
    notes: nullIfEmpty(parsed.data.notes),
    documentUrl: nullIfEmpty(parsed.data.documentUrl),
    clientId: parsed.data.clientId,
    caseId: nullIfEmpty(parsed.data.caseId),
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.powerOfAttorney.update({ where: { id: parsed.data.id }, data });
    await audit({ action: "power.update", userId: actor.id, entity: "PowerOfAttorney", entityId: parsed.data.id, ip });
  } else {
    const created = await prisma.powerOfAttorney.create({ data: { ...data, createdById: actor.id } });
    await audit({ action: "power.create", userId: actor.id, entity: "PowerOfAttorney", entityId: created.id, ip });
  }

  revalidatePath("/powers");
  return { ok: true, success: parsed.data.id ? "تم حفظ الوكالة" : "تمت إضافة الوكالة" };
}

export async function savePowerFormAction(formData: FormData): Promise<void> {
  await savePowerAction(formData);
}

export async function deletePowerAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };
  await prisma.powerOfAttorney.delete({ where: { id } });
  await audit({ action: "power.delete", userId: actor.id, entity: "PowerOfAttorney", entityId: id, ip: await getClientIp() });
  revalidatePath("/powers");
  return { ok: true, success: "تم حذف الوكالة" };
}

export async function deletePowerFormAction(formData: FormData): Promise<void> {
  await deletePowerAction(formData);
}
