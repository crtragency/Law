import "server-only";
import { headers } from "next/headers";

/** استخراج عنوان IP الخاص بالطالب من الترويسات. */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return h.get("x-real-ip") ?? null;
}

/** استخراج User-Agent. */
export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

/**
 * التحقق من مصدر الطلب (حماية إضافية من CSRF).
 * نقارن ترويسة Origin بترويسة Host. Server Actions محميّة أصلاً بواسطة
 * Next.js، لكن هذا فحص دفاعي إضافي.
 */
export async function verifySameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  // بعض الطلبات (مثل الملاحة العادية) لا تحمل Origin — نتساهل معها.
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
