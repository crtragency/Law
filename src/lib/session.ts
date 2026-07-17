import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "law_session";
// مدة صلاحية الجلسة: 8 ساعات (يوم عمل).
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** توليد توكن عشوائي آمن (سرّي، يوضع في الكوكي). */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** نخزّن هاش التوكن فقط في قاعدة البيانات، وليس التوكن نفسه. */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * إنشاء جلسة جديدة لمستخدم وتعيين الكوكي.
 * تُستدعى بعد نجاح تسجيل الدخول.
 */
export async function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // لا يمكن قراءته من جافاسكربت (حماية من XSS)
    secure: process.env.NODE_ENV === "production", // HTTPS فقط في الإنتاج
    sameSite: "lax", // حماية من CSRF
    path: "/",
    expires: expiresAt,
  });
}

/** جلب الجلسة الحالية من الكوكي والتحقق من صلاحيتها. */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  // انتهت صلاحيتها؟ احذفها.
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // الحساب معطّل؟ لا تسمح بالدخول.
  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

/** إنهاء الجلسة الحالية (تسجيل الخروج). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** إلغاء كل جلسات مستخدم معيّن (مثلاً عند تعطيل الحساب أو تغيير كلمة السر). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** تنظيف الجلسات المنتهية (يمكن استدعاؤها دورياً). */
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
