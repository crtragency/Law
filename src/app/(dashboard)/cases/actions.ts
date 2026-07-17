"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { caseSchema, commentSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";

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
      await prisma.case.update({ where: { id: parsed.data.id }, data });
      await audit({
        action: "case.update",
        userId: g.id,
        entity: "Case",
        entityId: parsed.data.id,
        ip,
      });
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

  await prisma.document.create({
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

  revalidatePath(`/cases/${parsed.data.caseId}`);
  return { ok: true, success: "تمت إضافة المستند" };
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
