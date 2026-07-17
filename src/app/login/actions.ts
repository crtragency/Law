"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, DUMMY_HASH } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent, verifySameOrigin } from "@/lib/request";
import { audit } from "@/lib/audit";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  // فحص دفاعي إضافي ضد CSRF.
  if (!(await verifySameOrigin())) {
    return { error: "طلب غير صالح" };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "تأكد من البريد وكلمة المرور" };
  }

  const { email, password } = parsed.data;
  const ip = await getClientIp();

  // تحديد المعدل: بالبريد وعنوان IP معاً.
  const rl = checkRateLimit(`login:${email}:${ip ?? "unknown"}`);
  if (!rl.allowed) {
    const mins = Math.ceil((rl.retryAfterSeconds ?? 0) / 60);
    return {
      error: `محاولات كثيرة. برجاء المحاولة بعد ${mins} دقيقة تقريباً`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // نتحقق دائماً من كلمة مرور (حتى لو المستخدم غير موجود) لمنع
  // تحديد الحسابات الموجودة عبر توقيت الاستجابة (timing attack).
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid || !user.isActive) {
    await audit({
      action: "user.login.failed",
      userId: user?.id,
      ip,
      details: { email, reason: !user ? "no_user" : !valid ? "bad_password" : "inactive" },
    });
    return { error: "بيانات الدخول غير صحيحة أو الحساب معطّل" };
  }

  // نجاح — أنشئ الجلسة.
  resetRateLimit(`login:${email}:${ip ?? "unknown"}`);
  await createSession(user.id, {
    ip: ip ?? undefined,
    userAgent: (await getUserAgent()) ?? undefined,
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({ action: "user.login", userId: user.id, ip });

  redirect("/dashboard");
}
