"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { FIRM_ID } from "@/lib/firm";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const firmSchema = z.object({
  name: z.string().trim().min(2, "اسم الشركة مطلوب").max(200),
  legalForm: z.string().trim().max(200).optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  branches: z.string().trim().max(200).optional().or(z.literal("")),
  phones: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(60).optional().or(z.literal("")),
  managerName: z.string().trim().max(150).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function saveFirmAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("firm.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = firmSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    name: parsed.data.name,
    legalForm: parsed.data.legalForm || null,
    licenseNumber: parsed.data.licenseNumber || null,
    address: parsed.data.address || null,
    branches: parsed.data.branches || null,
    phones: parsed.data.phones || null,
    email: parsed.data.email || null,
    taxNumber: parsed.data.taxNumber || null,
    managerName: parsed.data.managerName || null,
    city: parsed.data.city || null,
  };

  await prisma.firmSettings.upsert({
    where: { id: FIRM_ID },
    create: { id: FIRM_ID, ...data },
    update: data,
  });

  await audit({
    action: "firm.update",
    userId: actor.id,
    entity: "FirmSettings",
    entityId: FIRM_ID,
    ip: await getClientIp(),
  });

  revalidatePath("/admin/firm");
  return { ok: true, success: "تم حفظ بيانات الشركة" };
}
