import "server-only";
import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const PORTAL_COOKIE = "law_portal";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 ساعات

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** إنشاء جلسة بوابة لعميل وتعيين الكوكي. */
export async function createPortalSession(
  clientId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.clientSession.create({
    data: {
      tokenHash: hashToken(token),
      clientId,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** جلب العميل صاحب جلسة البوابة الحالية (أو null). */
export const getPortalClient = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.clientSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { client: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.clientSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.client.portalEnabled) return null;
  return session.client;
});

/** يتطلب عميلاً مسجَّلاً في البوابة، وإلا يعيد التوجيه لصفحة الدخول. */
export async function requirePortalClient() {
  const client = await getPortalClient();
  if (!client) redirect("/portal/login");
  return client;
}

/** إنهاء جلسة البوابة الحالية. */
export async function destroyPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (token) {
    await prisma.clientSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  cookieStore.delete(PORTAL_COOKIE);
}

/** إلغاء كل جلسات بوابة عميل (عند تعطيل الحساب أو تغيير كلمة السر). */
export async function revokeClientSessions(clientId: string): Promise<void> {
  await prisma.clientSession.deleteMany({ where: { clientId } });
}
