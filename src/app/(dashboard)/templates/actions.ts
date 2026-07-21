"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import {
  legalTemplateSchema,
  messageTemplateSchema,
  templateGenerateSchema,
  templateOutputSchema,
} from "@/lib/validation";
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

function parseCustomVariables(value: string | null | undefined) {
  const variables: Record<string, string> = {};
  for (const line of (value ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const val = trimmed.slice(separatorIndex + 1).trim();
    if (key) variables[key] = val;
  }
  return variables;
}

function renderTemplate(body: string, variables: Record<string, string>) {
  return body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

function clientDisplay(client?: { name: string; companyName: string | null; type: string } | null) {
  if (!client) return "";
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
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

export async function generateTemplateOutputAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = templateGenerateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات التوليد غير صحيحة" };
  }

  const template = await prisma.legalTemplate.findUnique({ where: { id: parsed.data.templateId } });
  if (!template || !template.isActive) return { ok: false, error: "النموذج غير متاح" };

  const [selectedClient, selectedCase] = await Promise.all([
    parsed.data.clientId
      ? prisma.client.findUnique({
          where: { id: parsed.data.clientId },
          select: {
            id: true,
            type: true,
            name: true,
            nationalId: true,
            nationality: true,
            companyName: true,
            unifiedNumber: true,
            taxNumber: true,
            phone: true,
            email: true,
            address: true,
          },
        })
      : null,
    parsed.data.caseId
      ? prisma.case.findUnique({
          where: { id: parsed.data.caseId },
          include: {
            client: {
              select: {
                id: true,
                type: true,
                name: true,
                nationalId: true,
                nationality: true,
                companyName: true,
                unifiedNumber: true,
                taxNumber: true,
                phone: true,
                email: true,
                address: true,
              },
            },
          },
        })
      : null,
  ]);

  const client = selectedClient ?? selectedCase?.client ?? null;
  const today = new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const variables = {
    today,
    templateTitle: template.title,
    clientName: clientDisplay(client),
    clientPersonalName: client?.name ?? "",
    clientCompanyName: client?.companyName ?? "",
    clientNationalId: client?.nationalId ?? "",
    clientNationality: client?.nationality ?? "",
    clientUnifiedNumber: client?.unifiedNumber ?? "",
    clientTaxNumber: client?.taxNumber ?? "",
    clientPhone: client?.phone ?? "",
    clientEmail: client?.email ?? "",
    clientAddress: client?.address ?? "",
    caseNumber: selectedCase?.caseNumber ?? "",
    caseTitle: selectedCase?.title ?? "",
    caseCourt: selectedCase?.court ?? "",
    caseStatus: selectedCase?.status ?? "",
    ...parseCustomVariables(parsed.data.variables),
  };
  const content = renderTemplate(template.body, variables);
  const title =
    parsed.data.title ||
    `${template.title} - ${clientDisplay(client) || selectedCase?.caseNumber || today}`;

  const output = await prisma.templateOutput.create({
    data: {
      title,
      content,
      templateId: template.id,
      clientId: client?.id ?? null,
      caseId: selectedCase?.id ?? null,
      createdById: actor.id,
    },
  });

  await audit({
    action: "template.output.generate",
    userId: actor.id,
    entity: "TemplateOutput",
    entityId: output.id,
    ip: await getClientIp(),
    details: { templateId: template.id },
  });
  revalidatePath("/templates");
  return { ok: true, success: "تم توليد المستند وحفظه" };
}

export async function generateTemplateOutputFormAction(formData: FormData): Promise<void> {
  await generateTemplateOutputAction(formData);
}

export async function saveMessageTemplateAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = messageTemplateSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات قالب الرسالة غير صحيحة" };
  }

  const data = {
    title: parsed.data.title,
    channel: parsed.data.channel,
    trigger: nullIfEmpty(parsed.data.trigger),
    subject: nullIfEmpty(parsed.data.subject),
    body: parsed.data.body,
    isActive: parsed.data.isActive,
  };
  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.messageTemplate.update({ where: { id: parsed.data.id }, data });
    await audit({ action: "messageTemplate.update", userId: actor.id, entity: "MessageTemplate", entityId: parsed.data.id, ip });
  } else {
    const created = await prisma.messageTemplate.create({ data: { ...data, createdById: actor.id } });
    await audit({ action: "messageTemplate.create", userId: actor.id, entity: "MessageTemplate", entityId: created.id, ip });
  }

  revalidatePath("/templates");
  return { ok: true, success: "تم حفظ قالب الرسالة" };
}

export async function saveMessageTemplateFormAction(formData: FormData): Promise<void> {
  await saveMessageTemplateAction(formData);
}
