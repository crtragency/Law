"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requirePortalClient } from "@/lib/portal-session";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { notifyMany } from "@/lib/notifications";
import { createSignedUploadUrl, storageConfigured } from "@/lib/storage";

export interface PortalActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const requestTypeToArea: Record<string, "FILE_MANAGEMENT" | "ADMIN_REQUEST" | "CONSULTATION" | "CLIENT_PORTAL"> = {
  DOCUMENT_UPLOAD: "FILE_MANAGEMENT",
  UPDATE_REQUEST: "CLIENT_PORTAL",
  MEETING_REQUEST: "ADMIN_REQUEST",
  QUESTION: "CONSULTATION",
};

const portalRequestSchema = z.object({
  caseId: z.string().min(1),
  requestType: z.enum(["DOCUMENT_UPLOAD", "UPDATE_REQUEST", "MEETING_REQUEST", "QUESTION"]),
  title: z.string().trim().min(3, "اكتب عنوان الطلب").max(160),
  description: z.string().trim().min(3, "اكتب تفاصيل الطلب").max(2000),
});

export async function createPortalCaseRequestAction(
  _prev: PortalActionResult,
  formData: FormData
): Promise<PortalActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  const client = await requirePortalClient();

  const parsed = portalRequestSchema.safeParse({
    caseId: formData.get("caseId"),
    requestType: formData.get("requestType"),
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات الطلب غير صحيحة" };
  }

  const caseInfo = await prisma.case.findFirst({
    where: { id: parsed.data.caseId, clientId: client.id },
    select: {
      id: true,
      title: true,
      caseNumber: true,
      assignedLawyerId: true,
      createdById: true,
    },
  });
  if (!caseInfo) return { ok: false, error: "القضية غير موجودة" };

  const service = await prisma.serviceRequest.create({
    data: {
      title: parsed.data.title,
      serviceArea: requestTypeToArea[parsed.data.requestType],
      status: "NEW",
      priority: parsed.data.requestType === "DOCUMENT_UPLOAD" ? "HIGH" : "MEDIUM",
      description: parsed.data.description,
      clientId: client.id,
      caseId: caseInfo.id,
    },
  });
  await audit({
    action: "portal.service.create",
    entity: "ServiceRequest",
    entityId: service.id,
    ip: await getClientIp(),
    details: { clientId: client.id, caseId: caseInfo.id, requestType: parsed.data.requestType },
  });
  await notifyMany([caseInfo.assignedLawyerId, caseInfo.createdById], {
    type: "portal.request",
    title: "طلب جديد من بوابة العميل",
    body: `${client.name}: ${parsed.data.title} - ${caseInfo.caseNumber}`,
    link: "/services",
  });

  revalidatePath("/services");
  revalidatePath(`/portal/cases/${caseInfo.id}`);
  return { ok: true, success: "تم إرسال الطلب للمكتب" };
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const uploadUrlSchema = z.object({
  caseId: z.string().min(1),
  fileName: z.string().trim().min(1).max(200),
});

export async function createPortalCaseUploadUrlAction(input: {
  caseId: string;
  fileName: string;
}): Promise<
  | { ok: true; uploadUrl: string; storageKey: string }
  | { ok: false; error: string }
> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  const client = await requirePortalClient();
  if (!storageConfigured()) {
    return { ok: false, error: "رفع الملفات غير مفعّل حالياً لدى المكتب" };
  }

  const parsed = uploadUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات رفع غير صحيحة" };

  const exists = await prisma.case.findFirst({
    where: { id: parsed.data.caseId, clientId: client.id },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "القضية غير موجودة" };

  const safeName = parsed.data.fileName
    .replace(/[^\w.\-\u0600-\u06FF]+/g, "_")
    .slice(-100);
  const storageKey = `portal/cases/${parsed.data.caseId}/${crypto.randomUUID()}-${safeName}`;
  try {
    const uploadUrl = await createSignedUploadUrl(storageKey);
    return { ok: true, uploadUrl, storageKey };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "تعذر تجهيز رفع المستند",
    };
  }
}

const registerUploadSchema = z.object({
  caseId: z.string().min(1),
  requestId: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(1, "اسم المستند مطلوب").max(200),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  storageKey: z.string().min(1).max(600),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().max(150).optional().or(z.literal("")),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export async function registerPortalCaseDocumentAction(input: {
  caseId: string;
  requestId?: string;
  title: string;
  category?: string;
  notes?: string;
  storageKey: string;
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
}): Promise<PortalActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  const client = await requirePortalClient();

  const parsed = registerUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات المستند غير صحيحة" };
  }
  if (!parsed.data.storageKey.startsWith(`portal/cases/${parsed.data.caseId}/`)) {
    return { ok: false, error: "مسار غير صالح" };
  }

  const caseInfo = await prisma.case.findFirst({
    where: { id: parsed.data.caseId, clientId: client.id },
    select: {
      id: true,
      caseNumber: true,
      assignedLawyerId: true,
      createdById: true,
    },
  });
  if (!caseInfo) return { ok: false, error: "القضية غير موجودة" };

  const document = await prisma.document.create({
    data: {
      caseId: caseInfo.id,
      title: parsed.data.title,
      category: parsed.data.category || null,
      notes: parsed.data.notes || null,
      storageKey: parsed.data.storageKey,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType || null,
      sizeBytes: parsed.data.sizeBytes,
      visibility: "PORTAL",
    },
  });

  if (parsed.data.requestId) {
    await prisma.documentRequest.updateMany({
      where: {
        id: parsed.data.requestId,
        caseId: caseInfo.id,
        status: "REQUESTED",
      },
      data: { status: "RECEIVED" },
    });
  }

  const service = await prisma.serviceRequest.create({
    data: {
      title: `مستند مرفوع من العميل: ${parsed.data.title}`,
      serviceArea: "FILE_MANAGEMENT",
      status: "NEW",
      priority: "HIGH",
      description: parsed.data.notes || `تم رفع الملف: ${parsed.data.fileName}`,
      clientId: client.id,
      caseId: caseInfo.id,
    },
  });

  await audit({
    action: "portal.document.upload",
    entity: "Document",
    entityId: document.id,
    ip: await getClientIp(),
    details: { clientId: client.id, caseId: caseInfo.id, fileName: parsed.data.fileName },
  });
  await notifyMany([caseInfo.assignedLawyerId, caseInfo.createdById], {
    type: "portal.document",
    title: "مستند جديد من العميل",
    body: `${client.name}: ${parsed.data.title} - ${caseInfo.caseNumber}`,
    link: `/cases/${caseInfo.id}`,
  });

  revalidatePath("/services");
  revalidatePath(`/cases/${caseInfo.id}`);
  revalidatePath(`/portal/cases/${caseInfo.id}`);
  return { ok: true, success: `تم رفع المستند وإرسال طلب متابعة رقم ${service.id.slice(-6)}` };
}
