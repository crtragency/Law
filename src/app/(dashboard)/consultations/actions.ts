"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { legalConsultationSchema } from "@/lib/validation";

export interface ConsultationActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function requireManage(): Promise<{ id: string; name: string } | ConsultationActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("consultations.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveConsultationAction(
  _prev: ConsultationActionResult,
  formData: FormData
): Promise<ConsultationActionResult> {
  const actor = await requireManage();
  if ("ok" in actor) return actor;

  const parsed = legalConsultationSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    question: formData.get("question"),
    legalOpinion: formData.get("legalOpinion") ?? "",
    recommendation: formData.get("recommendation") ?? "",
    status: formData.get("status") || "NEW",
    priority: formData.get("priority") || "MEDIUM",
    source: formData.get("source") || "OFFICE",
    requesterName: formData.get("requesterName") ?? "",
    requesterPhone: formData.get("requesterPhone") ?? "",
    requesterEmail: formData.get("requesterEmail") ?? "",
    clientId: formData.get("clientId") ?? "",
    caseId: formData.get("caseId") ?? "",
    assignedToId: formData.get("assignedToId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات الاستشارة" };
  }

  const previous = parsed.data.id
    ? await prisma.legalConsultation.findUnique({
        where: { id: parsed.data.id },
        select: { status: true },
      })
    : null;

  const now = new Date();
  const data = {
    title: parsed.data.title,
    question: parsed.data.question,
    legalOpinion: parsed.data.legalOpinion || null,
    recommendation: parsed.data.recommendation || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    source: parsed.data.source,
    requesterName: parsed.data.requesterName || null,
    requesterPhone: parsed.data.requesterPhone || null,
    requesterEmail: parsed.data.requesterEmail || null,
    clientId: parsed.data.clientId || null,
    caseId: parsed.data.caseId || null,
    assignedToId: parsed.data.assignedToId || null,
    reviewedAt: parsed.data.status === "OPINION_READY" ? now : null,
    convertedAt: parsed.data.status === "CONVERTED" ? now : null,
  };

  const consultation = parsed.data.id
    ? await prisma.legalConsultation.update({
        where: { id: parsed.data.id },
        data,
      })
    : await prisma.legalConsultation.create({
        data: { ...data, createdById: actor.id },
      });

  await audit({
    action: parsed.data.id ? "consultation.update" : "consultation.create",
    userId: actor.id,
    entity: "LegalConsultation",
    entityId: consultation.id,
    ip: await getClientIp(),
  });

  if (
    consultation.status === "OPINION_READY" &&
    previous?.status !== "OPINION_READY" &&
    consultation.requesterEmail
  ) {
    await sendEmail({
      to: consultation.requesterEmail,
      subject: `الرأي القانوني جاهز: ${consultation.title}`,
      heading: "تم تجهيز الرد على استشارتك",
      lines: [
        `موضوع الاستشارة: ${consultation.title}`,
        ...(consultation.legalOpinion ? [consultation.legalOpinion] : []),
        ...(consultation.recommendation ? [`التوصية: ${consultation.recommendation}`] : []),
      ],
    });
  }

  revalidatePath("/consultations");
  revalidatePath("/dashboard");
  return { ok: true, success: parsed.data.id ? "تم حفظ الاستشارة" : "تمت إضافة الاستشارة" };
}

export async function saveConsultationFormAction(formData: FormData) {
  await saveConsultationAction({ ok: false }, formData);
}

export async function deleteConsultationFormAction(formData: FormData) {
  const actor = await requireManage();
  if ("ok" in actor) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.legalConsultation.delete({ where: { id } }).catch(() => null);
  await audit({
    action: "consultation.delete",
    userId: actor.id,
    entity: "LegalConsultation",
    entityId: id,
    ip: await getClientIp(),
  });
  revalidatePath("/consultations");
  revalidatePath("/dashboard");
}
