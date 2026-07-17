import "server-only";
import { z } from "zod";

// التحقق من متغيرات البيئة عند بدء التشغيل — يفشل مبكراً إذا كان الإعداد ناقصاً.
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL يجب أن يكون رابطاً صحيحاً"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `خطأ في إعدادات البيئة (Environment):\n${issues}\n` +
        `راجع ملف .env.example وتأكد من ضبط .env.local`
    );
  }
  return parsed.data;
}

export const env = loadEnv();
