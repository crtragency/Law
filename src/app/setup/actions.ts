"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { createSession } from "@/lib/session";
import { verifySameOrigin, getClientIp, getUserAgent } from "@/lib/request";
import { audit } from "@/lib/audit";

const setupSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(100),
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف").max(128),
});

export interface SetupState {
  error?: string;
}

export async function setupAction(
  _prev: SetupState,
  formData: FormData
): Promise<SetupState> {
  if (!(await verifySameOrigin())) {
    return { error: "طلب غير صالح" };
  }

  // صفحة الإعداد تعمل مرة واحدة فقط: طالما لا يوجد أي مستخدم في النظام.
  let userCount: number;
  try {
    userCount = await prisma.user.count();
  } catch {
    return {
      error:
        "قاعدة البيانات غير مهيأة بعد. تأكد من ضبط DATABASE_URL وإعادة النشر ثم حاول مجدداً.",
    };
  }
  if (userCount > 0) {
    return { error: "تم إعداد النظام بالفعل. من فضلك سجّل الدخول." };
  }

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const strength = validatePasswordStrength(parsed.data.password);
  if (strength) return { error: strength };

  // إنشاء حساب المدير الأول (ADMIN).
  const admin = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "ADMIN",
      isActive: true,
    },
  });

  const ip = await getClientIp();
  await createSession(admin.id, {
    ip: ip ?? undefined,
    userAgent: (await getUserAgent()) ?? undefined,
  });
  await audit({
    action: "setup.admin_created",
    userId: admin.id,
    entity: "User",
    entityId: admin.id,
    ip,
    details: { email: admin.email },
  });

  // نجاح — ادخل مباشرة للوحة التحكم.
  redirect("/dashboard");
}
