"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { AuthError, ensurePermission } from "@/lib/auth";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import { extractDocumentTextFromStorage } from "@/lib/document-ocr";
import { prisma } from "@/lib/prisma";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { createSignedUploadUrl, storageConfigured } from "@/lib/storage";

export type DocumentActionResult = { ok: true; success?: string } | { ok: false; error?: string };

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const uploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
});

const registerSchema = z.object({
  title: z.string().trim().min(1, "عنوان الملف مطلوب").max(200),
  storageKey: z.string().min(1).max(600),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().max(150).optional().or(z.literal("")),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.string().trim().max(300).optional().or(z.literal("")),
  visibility: z.enum(["INTERNAL", "PORTAL"]).default("INTERNAL"),
  expiresAt: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  extractedText: z.string().trim().max(30000).optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
});

function safeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-\u0600-\u06FF]+/g, "_").slice(-100);
}

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function requireDocumentManager() {
  if (!(await verifySameOrigin())) return null;
  try {
    return await ensurePermission("documents.manage");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

async function resolveDocumentIndex(input: {
  manualText?: string;
  storageKey: string;
  fileName: string;
  mimeType?: string | null;
}) {
  const manualText = input.manualText?.trim();
  if (manualText) {
    return { extractedText: manualText, ocrStatus: "INDEXED" as const, indexedAt: new Date() };
  }
  const result = await extractDocumentTextFromStorage({
    storageKey: input.storageKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
  return {
    extractedText: result.text,
    ocrStatus: result.status,
    indexedAt: result.text ? new Date() : null,
  };
}

export async function createGeneralDocumentUploadUrlAction(input: {
  fileName: string;
}): Promise<
  | { ok: true; uploadUrl: string; storageKey: string }
  | { ok: false; error: string }
> {
  const actor = await requireDocumentManager();
  if (!actor) return { ok: false, error: "طلب غير صالح" };
  if (!storageConfigured()) return { ok: false, error: "رفع الملفات غير مفعل بعد" };

  const parsed = uploadUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "اسم الملف غير صالح" };

  const storageKey = `files/${actor.id}/${crypto.randomUUID()}-${safeFileName(parsed.data.fileName)}`;
  try {
    const uploadUrl = await createSignedUploadUrl(storageKey);
    return { ok: true, uploadUrl, storageKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذر تجهيز رابط الرفع" };
  }
}

export async function registerGeneralDocumentAction(input: {
  title: string;
  storageKey: string;
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  category?: string;
  tags?: string;
  visibility?: "INTERNAL" | "PORTAL";
  expiresAt?: string;
  notes?: string;
  extractedText?: string;
  caseId?: string;
}): Promise<DocumentActionResult> {
  const actor = await requireDocumentManager();
  if (!actor) return { ok: false, error: "طلب غير صالح" };

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات الملف غير صالحة" };
  }
  if (!parsed.data.storageKey.startsWith(`files/${actor.id}/`)) {
    return { ok: false, error: "مسار الملف غير صالح" };
  }

  const caseId = parsed.data.caseId || null;
  const visibility = caseId ? parsed.data.visibility : "INTERNAL";
  if (caseId) {
    const exists = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
    if (!exists) return { ok: false, error: "القضية غير موجودة" };
  }

  const expiresAt = parseOptionalDate(parsed.data.expiresAt);
  if (parsed.data.expiresAt && !expiresAt) return { ok: false, error: "تاريخ الانتهاء غير صالح" };

  const index = await resolveDocumentIndex({
    manualText: parsed.data.extractedText,
    storageKey: parsed.data.storageKey,
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType || null,
  });

  const document = await prisma.document.create({
    data: {
      caseId,
      title: parsed.data.title,
      storageKey: parsed.data.storageKey,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType || null,
      sizeBytes: parsed.data.sizeBytes,
      category: parsed.data.category || null,
      tags: parsed.data.tags || null,
      visibility,
      expiresAt,
      notes: parsed.data.notes || null,
      extractedText: index.extractedText,
      ocrStatus: index.ocrStatus,
      indexedAt: index.indexedAt,
      uploadedById: actor.id,
    },
  });

  await audit({
    action: "document.upload.general",
    userId: actor.id,
    entity: "Document",
    entityId: document.id,
    ip: await getClientIp(),
    details: { fileName: parsed.data.fileName, sizeBytes: parsed.data.sizeBytes, caseId },
  });

  if (caseId && document.visibility === "PORTAL") {
    await notifyClientCaseUpdate(caseId, {
      subject: `مستند جديد على قضيتك: ${document.title}`,
      heading: "تم رفع مستند جديد لقضيتك",
      lines: [`المستند: ${document.title}`, `الملف: ${document.fileName}`],
    });
    revalidatePath(`/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}`);
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { ok: true, success: "تم رفع الملف" };
}

export async function deleteGeneralDocumentFormAction(formData: FormData): Promise<void> {
  const actor = await requireDocumentManager();
  if (!actor) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const doc = await prisma.document.findUnique({ where: { id }, select: { caseId: true } });
  await prisma.document.delete({ where: { id } }).catch(() => null);
  await audit({
    action: "document.delete",
    userId: actor.id,
    entity: "Document",
    entityId: id,
    ip: await getClientIp(),
  });
  revalidatePath("/documents");
  if (doc?.caseId) revalidatePath(`/cases/${doc.caseId}`);
}
