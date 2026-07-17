import { PrismaClient } from "@prisma/client";

// نستخدم نسخة واحدة (singleton) من Prisma لتجنّب إنشاء اتصالات كثيرة
// أثناء التطوير مع إعادة التحميل الساخن (hot reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
