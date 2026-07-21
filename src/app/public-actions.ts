"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyMany } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { publicConsultationSchema } from "@/lib/validation";

export interface PublicConsultationResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export async function createPublicConsultationAction(
  _prev: PublicConsultationResult,
  formData: FormData
): Promise<PublicConsultationResult> {
  if (!(await verifySameOrigin())) {
    return { ok: false, error: "طلب غير صالح" };
  }

  const parsed = publicConsultationSchema.safeParse({
    requesterName: formData.get("requesterName"),
    requesterPhone: formData.get("requesterPhone"),
    requesterEmail: formData.get("requesterEmail") ?? "",
    title: formData.get("title"),
    question: formData.get("question"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "راجع بيانات الاستشارة",
    };
  }

  const consultation = await prisma.legalConsultation.create({
    data: {
      title: parsed.data.title,
      question: parsed.data.question,
      requesterName: parsed.data.requesterName,
      requesterPhone: parsed.data.requesterPhone,
      requesterEmail: parsed.data.requesterEmail || null,
      source: "PUBLIC_SITE",
      status: "NEW",
      priority: "MEDIUM",
    },
  });

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "LAWYER", "PARALEGAL"] },
    },
    select: { id: true },
    take: 20,
  });
  await notifyMany(
    recipients.map((user) => user.id),
    {
      type: "consultation.public",
      title: "طلب استشارة جديد من الموقع",
      body: `${parsed.data.requesterName}: ${parsed.data.title}`,
      link: "/consultations",
    }
  );
  await audit({
    action: "consultation.public.create",
    entity: "LegalConsultation",
    entityId: consultation.id,
    ip: await getClientIp(),
    details: {
      requesterName: parsed.data.requesterName,
      requesterPhone: parsed.data.requesterPhone,
    },
  });

  revalidatePath("/");
  revalidatePath("/consultations");
  return { ok: true, success: "تم استلام طلبك. سيقوم المكتب بالتواصل معك قريباً." };
}
