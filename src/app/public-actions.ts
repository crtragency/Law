"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyMany } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { publicConsultationSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export interface PublicConsultationResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export interface SaasLeadResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const saasLeadSchema = z.object({
  contactName: z.string().trim().min(2, "اكتب الاسم بالكامل").max(120),
  firmName: z.string().trim().min(2, "اكتب اسم المكتب").max(180),
  phone: z.string().trim().min(7, "اكتب رقم تواصل صحيح").max(30),
  email: z
    .string()
    .trim()
    .max(180)
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "راجع البريد الإلكتروني",
    }),
  teamSize: z.enum(["1-5", "6-15", "16-30", "31+"]).optional(),
});

export async function createSaasLeadAction(
  _prev: SaasLeadResult,
  formData: FormData
): Promise<SaasLeadResult> {
  if (!(await verifySameOrigin())) {
    return { ok: false, error: "تعذر إرسال الطلب. حدّث الصفحة وحاول مرة أخرى." };
  }

  const ip = await getClientIp();
  const limit = checkRateLimit(`saas-lead:${ip ?? "unknown"}`);
  if (!limit.allowed) {
    return {
      ok: false,
      error: "تم استلام محاولات متعددة. حاول مرة أخرى بعد قليل.",
    };
  }

  const parsed = saasLeadSchema.safeParse({
    contactName: formData.get("contactName"),
    firmName: formData.get("firmName"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    teamSize: formData.get("teamSize") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "راجع البيانات المدخلة",
    };
  }

  const lead = await prisma.saasLead.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
    },
  });

  const admins = await prisma.user.findMany({
    where: { isActive: true, role: "ADMIN" },
    select: { id: true },
    take: 20,
  });
  await notifyMany(
    admins.map((admin) => admin.id),
    {
      type: "saas.lead",
      title: "طلب اشتراك جديد في منصة ميزان",
      body: `${parsed.data.contactName} - ${parsed.data.firmName} - ${parsed.data.phone}`,
      link: "/notifications",
    }
  );
  await audit({
    action: "saas.lead.create",
    entity: "SaasLead",
    entityId: lead.id,
    ip,
    details: {
      firmName: parsed.data.firmName,
      teamSize: parsed.data.teamSize,
    },
  });

  revalidatePath("/");
  return {
    ok: true,
    success: "وصلنا طلبك. سنتواصل معك لتجهيز مكتبك وتجربة النظام.",
  };
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
