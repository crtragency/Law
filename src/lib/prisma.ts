import { PrismaClient } from "@prisma/client";

// نستخدم نسخة واحدة (singleton) من Prisma لتجنّب إنشاء اتصالات كثيرة
// أثناء التطوير مع إعادة التحميل الساخن (hot reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * تجهيز رابط الاتصال بشكل آمن للبيئات بلا خوادم (serverless مثل Vercel).
 * مع Supabase Pooler لازم نحدّ عدد الاتصالات لكل نسخة (connection_limit=1)
 * ونفعّل وضع pgbouncer حتى لا تُستنزف حصة الاتصالات ويتوقف الموقع.
 */
function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const isPooler = url.hostname.includes("pooler.supabase.com");
    // منفذ 6543 = وضع Transaction (يتحمّل مئات العملاء) — نسمح بتوازٍ أعلى.
    // منفذ 5432 على الـ Pooler = وضع Session (سعة 15 عميلاً فقط) — اتصال واحد
    // لكل نسخة حتى لا تُستنزف الحصة ويتوقف الموقع.
    const isTransactionMode = url.port === "6543";
    if (isPooler) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set(
          "connection_limit",
          isTransactionMode ? "10" : "1"
        );
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "15");
      }
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
