"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { caseSchema, commentSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { notifyMany } from "@/lib/notifications";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import { createSignedUploadUrl, storageConfigured } from "@/lib/storage";
import { CASE_STATUS_LABELS } from "@/lib/labels";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function requireManage(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const u = await ensurePermission("cases.manage");
    return { id: u.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveCaseAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const g = await requireManage();
  if ("ok" in g) return g;

  const parsed = caseSchema.safeParse({
    id: formData.get("id") || undefined,
    caseNumber: formData.get("caseNumber"),
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    court: formData.get("court") ?? "",
    caseType: formData.get("caseType"),
    status: formData.get("status"),
    assignedLawyerId: formData.get("assignedLawyerId") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    caseNumber: parsed.data.caseNumber,
    title: parsed.data.title,
    clientId: parsed.data.clientId,
    court: parsed.data.court || null,
    caseType: parsed.data.caseType,
    status: parsed.data.status,
    assignedLawyerId: parsed.data.assignedLawyerId || null,
    description: parsed.data.description || null,
  };

  const ip = await getClientIp();
  try {
    if (parsed.data.id) {
      // نقرأ الحالة السابقة لاكتشاف تغيّرها وإشعار العميل.
      const before = await prisma.case.findUnique({
        where: { id: parsed.data.id },
        select: { status: true },
      });
      await prisma.case.update({ where: { id: parsed.data.id }, data });
      await audit({
        action: "case.update",
        userId: g.id,
        entity: "Case",
        entityId: parsed.data.id,
        ip,
      });
      // إشعار العميل بالبريد عند تغيّر حالة القضية.
      if (before && before.status !== parsed.data.status) {
        await notifyClientCaseUpdate(parsed.data.id, {
          subject: `تحديث حالة قضيتك: ${parsed.data.title}`,
          heading: "تم تحديث حالة قضيتك",
          lines: [
            `قضية: ${parsed.data.title} (${parsed.data.caseNumber})`,
            `الحالة الجديدة: ${CASE_STATUS_LABELS[parsed.data.status] ?? parsed.data.status}`,
          ],
        });
      }
      revalidatePath(`/cases/${parsed.data.id}`);
    } else {
      const created = await prisma.case.create({
        data: { ...data, createdById: g.id },
      });
      await audit({
        action: "case.create",
        userId: g.id,
        entity: "Case",
        entityId: created.id,
        ip,
      });
      await notifyClientCaseUpdate(created.id, {
        subject: `تم فتح قضية جديدة: ${created.title}`,
        heading: "تم فتح قضية جديدة لك",
        lines: [
          `قضية: ${created.title} (${created.caseNumber})`,
          `الحالة الحالية: ${CASE_STATUS_LABELS[created.status] ?? created.status}`,
          ...(created.court ? [`المحكمة: ${created.court}`] : []),
        ],
      });
    }
  } catch (e: unknown) {
    // خطأ تفرّد رقم القضية.
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "رقم القضية مستخدم بالفعل" };
    }
    throw e;
  }

  revalidatePath("/cases");
  return { ok: true, success: parsed.data.id ? "تم حفظ القضية" : "تمت إضافة القضية" };
}

export async function deleteCaseAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const g = await requireManage();
  if ("ok" in g) return g;

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  await prisma.case.delete({ where: { id } });
  await audit({
    action: "case.delete",
    userId: g.id,
    entity: "Case",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/cases");
  return { ok: true, success: "تم حذف القضية" };
}

export async function addCaseNoteAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // إضافة ملاحظة متاحة لكل من يستطيع عرض القضية (تواصل الفريق).
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("cases.view");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const caseId = String(formData.get("caseId") ?? "");
  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!caseId || !parsed.success) {
    return { ok: false, error: "اكتب ملاحظة صحيحة" };
  }

  await prisma.caseNote.create({
    data: { caseId, body: parsed.data.body, authorId: actor.id },
  });
  await audit({
    action: "case.note.add",
    userId: actor.id,
    entity: "Case",
    entityId: caseId,
    ip: await getClientIp(),
  });

  // أشعر المحامي المسؤول ومُنشئ القضية بالملاحظة الجديدة (عدا كاتبها).
  const caseInfo = await prisma.case.findUnique({
    where: { id: caseId },
    select: { title: true, assignedLawyerId: true, createdById: true },
  });
  if (caseInfo) {
    await notifyMany(
      [caseInfo.assignedLawyerId, caseInfo.createdById].filter(
        (id) => id !== actor.id
      ),
      {
        type: "case.note",
        title: "ملاحظة جديدة على قضية",
        body: `${actor.name}: ${caseInfo.title}`,
        link: `/cases/${caseId}`,
      }
    );
  }

  revalidatePath(`/cases/${caseId}`);
  return { ok: true, success: "تمت إضافة الملاحظة" };
}

const documentSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().trim().min(1, "عنوان المستند مطلوب").max(200),
  storageKey: z.string().trim().min(1, "أدخل رابط/مرجع المستند").max(1000),
  fileName: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function addDocumentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("documents.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = documentSchema.safeParse({
    caseId: formData.get("caseId"),
    title: formData.get("title"),
    storageKey: formData.get("storageKey"),
    fileName: formData.get("fileName") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const document = await prisma.document.create({
    data: {
      caseId: parsed.data.caseId,
      title: parsed.data.title,
      storageKey: parsed.data.storageKey,
      fileName: parsed.data.fileName || parsed.data.title,
      uploadedById: actor.id,
    },
  });
  await audit({
    action: "document.add",
    userId: actor.id,
    entity: "Case",
    entityId: parsed.data.caseId,
    ip: await getClientIp(),
  });
  if (document.visibility === "PORTAL") {
    await notifyClientCaseUpdate(parsed.data.caseId, {
      subject: `مستند جديد على قضيتك: ${document.title}`,
      heading: "تمت إضافة مستند جديد لقضيتك",
      lines: [
        `المستند: ${document.title}`,
        `الملف: ${document.fileName}`,
      ],
    });
  }

  revalidatePath(`/cases/${parsed.data.caseId}`);
  return { ok: true, success: "تمت إضافة المستند" };
}

// ===========================================================================
//  رفع الملفات الفعلي — Supabase Storage
// ===========================================================================

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

const uploadRequestSchema = z.object({
  caseId: z.string().min(1),
  fileName: z.string().trim().min(1).max(200),
});

/** الخطوة 1: تجهيز رابط رفع موقّع — المتصفح يرفع الملف مباشرة للتخزين. */
export async function createUploadUrlAction(input: {
  caseId: string;
  fileName: string;
}): Promise<
  | { ok: true; uploadUrl: string; storageKey: string }
  | { ok: false; error: string }
> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    await ensurePermission("documents.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  if (!storageConfigured()) {
    return {
      ok: false,
      error:
        "رفع الملفات غير مُفعّل بعد — أضف SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY ثم أعد النشر",
    };
  }

  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة" };

  const exists = await prisma.case.findUnique({
    where: { id: parsed.data.caseId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "القضية غير موجودة" };

  // اسم آمن: معرّف عشوائي + الاسم الأصلي بعد تنظيفه.
  const safeName = parsed.data.fileName
    .replace(/[^\w.\-؀-ۿ]+/g, "_")
    .slice(-100);
  const storageKey = `cases/${parsed.data.caseId}/${crypto.randomUUID()}-${safeName}`;

  try {
    const uploadUrl = await createSignedUploadUrl(storageKey);
    return { ok: true, uploadUrl, storageKey };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "تعذّر تجهيز الرفع",
    };
  }
}

const registerUploadSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().trim().min(1, "عنوان المستند مطلوب").max(200),
  storageKey: z.string().min(1).max(600),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().max(150).optional().or(z.literal("")),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

/** الخطوة 2: بعد نجاح الرفع، تسجيل المستند في قاعدة البيانات. */
export async function registerUploadedDocumentAction(input: {
  caseId: string;
  title: string;
  storageKey: string;
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
}): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("documents.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = registerUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  // حماية: المسار يجب أن يتبع نفس القضية المرسلة، لا مسار آخر.
  if (!parsed.data.storageKey.startsWith(`cases/${parsed.data.caseId}/`)) {
    return { ok: false, error: "مسار غير صالح" };
  }

  const document = await prisma.document.create({
    data: {
      caseId: parsed.data.caseId,
      title: parsed.data.title,
      storageKey: parsed.data.storageKey,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType || null,
      sizeBytes: parsed.data.sizeBytes,
      uploadedById: actor.id,
    },
  });
  await audit({
    action: "document.add",
    userId: actor.id,
    entity: "Case",
    entityId: parsed.data.caseId,
    ip: await getClientIp(),
    details: { fileName: parsed.data.fileName, sizeBytes: parsed.data.sizeBytes },
  });
  if (document.visibility === "PORTAL") {
    await notifyClientCaseUpdate(parsed.data.caseId, {
      subject: `مستند جديد على قضيتك: ${document.title}`,
      heading: "تم رفع مستند جديد لقضيتك",
      lines: [
        `المستند: ${document.title}`,
        `الملف: ${document.fileName}`,
      ],
    });
  }

  revalidatePath(`/cases/${parsed.data.caseId}`);
  return { ok: true, success: "تم رفع المستند" };
}

export async function deleteDocumentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("documents.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  await prisma.document.delete({ where: { id } });
  await audit({
    action: "document.delete",
    userId: actor.id,
    entity: "Document",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath(`/cases/${caseId}`);
  return { ok: true, success: "تم حذف المستند" };
}
