"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, DUMMY_HASH } from "@/lib/password";
import { createPortalSession } from "@/lib/portal-session";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent, verifySameOrigin } from "@/lib/request";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export interface PortalLoginState {
  error?: string;
}

export async function portalLoginAction(
  _prev: PortalLoginState,
  formData: FormData
): Promise<PortalLoginState> {
  if (!(await verifySameOrigin())) return { error: "طلب غير صالح" };

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "تأكد من البريد وكلمة المرور" };

  const { email, password } = parsed.data;
  const ip = await getClientIp();

  const rl = checkRateLimit(`portal:${email}:${ip ?? "?"}`);
  if (!rl.allowed) {
    const mins = Math.ceil((rl.retryAfterSeconds ?? 0) / 60);
    return { error: `محاولات كثيرة. حاول بعد ${mins} دقيقة تقريباً` };
  }

  const client = await prisma.client.findUnique({
    where: { portalEmail: email },
  });

  const valid = await verifyPassword(
    password,
    client?.portalPasswordHash ?? DUMMY_HASH
  );

  if (!client || !client.portalEnabled || !client.portalPasswordHash || !valid) {
    return { error: "بيانات الدخول غير صحيحة أو الحساب غير مُفعّل" };
  }

  resetRateLimit(`portal:${email}:${ip ?? "?"}`);
  await createPortalSession(client.id, {
    ip: ip ?? undefined,
    userAgent: (await getUserAgent()) ?? undefined,
  });
  await audit({ action: "portal.login", entity: "Client", entityId: client.id, ip });

  redirect("/portal");
}
