"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { legalTemplateSchema, templateOutputSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { nullIfEmpty } from "@/lib/action-form";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("templates.manage");
    return { id: user.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveTemplateAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = legalTemplateSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    title: parsed.data.title,
    category: parsed.data.category,
    body: parsed.data.body,
    variables: nullIfEmpty(parsed.data.variables),
    notes: nullIfEmpty(parsed.data.notes),
    isActive: parsed.data.isActive,
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.legalTemplate.update({ where: { id: parsed.data.id }, data });
    await audit({ action: "template.update", userId: actor.id, entity: "LegalTemplate", entityId: parsed.data.id, ip });
  } else {
    const created = await prisma.legalTemplate.create({ data: { ...data, createdById: actor.id } });
    await audit({ action: "template.create", userId: actor.id, entity: "LegalTemplate", entityId: created.id, ip });
  }

  revalidatePath("/templates");
  return { ok: true, success: "تم حفظ النموذج" };
}

export async function saveTemplateFormAction(formData: FormData): Promise<void> {
  await saveTemplateAction(formData);
}

export async function saveTemplateOutputAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = templateOutputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const output = await prisma.templateOutput.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      templateId: nullIfEmpty(parsed.data.templateId),
      clientId: nullIfEmpty(parsed.data.clientId),
      caseId: nullIfEmpty(parsed.data.caseId),
      createdById: actor.id,
    },
  });
  await audit({ action: "template.output.create", userId: actor.id, entity: "TemplateOutput", entityId: output.id, ip: await getClientIp() });
  revalidatePath("/templates");
  return { ok: true, success: "تم حفظ المستند" };
}

export async function saveTemplateOutputFormAction(formData: FormData): Promise<void> {
  await saveTemplateOutputAction(formData);
}
