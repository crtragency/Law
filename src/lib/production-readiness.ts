import "server-only";

export type ReadinessLevel = "ready" | "warning" | "missing";

export interface ReadinessCheck {
  key: string;
  category: string;
  label: string;
  level: ReadinessLevel;
  value: string;
  hint: string;
}

function valueOf(name: string) {
  return process.env[name]?.trim() ?? "";
}

function isPlaceholder(value: string) {
  const lower = value.toLowerCase();
  return (
    !value ||
    lower.includes("xxxx") ||
    lower.includes("your-app") ||
    lower.includes("example.com") ||
    lower.includes("password") ||
    value.includes("ضع-") ||
    value.includes("هنا")
  );
}

function masked(value: string) {
  if (!value) return "غير مضبوط";
  if (value.length <= 8) return "مضبوط";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function requiredEnv(name: string, label: string, category: string, hint: string): ReadinessCheck {
  const value = valueOf(name);
  const ok = !!value && !isPlaceholder(value);
  return {
    key: name,
    category,
    label,
    level: ok ? "ready" : "missing",
    value: masked(value),
    hint,
  };
}

function optionalEnv(name: string, label: string, category: string, hint: string): ReadinessCheck {
  const value = valueOf(name);
  const ok = !!value && !isPlaceholder(value);
  return {
    key: name,
    category,
    label,
    level: ok ? "ready" : "warning",
    value: masked(value),
    hint,
  };
}

export function getProductionReadinessChecks(): ReadinessCheck[] {
  const appUrl = valueOf("APP_URL");
  const nodeEnv = valueOf("NODE_ENV") || "development";
  const appUrlReady = !!appUrl && !isPlaceholder(appUrl) && (nodeEnv !== "production" || appUrl.startsWith("https://"));

  return [
    requiredEnv("DATABASE_URL", "قاعدة البيانات", "الأساسيات", "مطلوب PostgreSQL ثابت قبل التشغيل الحقيقي."),
    {
      key: "APP_URL",
      category: "الأساسيات",
      label: "رابط التطبيق",
      level: appUrlReady ? "ready" : "missing",
      value: masked(appUrl),
      hint: "مطلوب للروابط داخل رسائل البريد وبوابة العميل، ويجب أن يكون HTTPS في الإنتاج.",
    },
    {
      key: "NODE_ENV",
      category: "الأساسيات",
      label: "وضع التشغيل",
      level: nodeEnv === "production" ? "ready" : "warning",
      value: nodeEnv,
      hint: "استخدم production عند النشر النهائي.",
    },
    requiredEnv("SUPABASE_URL", "رابط تخزين الملفات", "التخزين", "مطلوب لرفع وتحميل المستندات الفعلية."),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY", "مفتاح التخزين السري", "التخزين", "مطلوب للتوقيع على روابط رفع/تحميل المستندات."),
    requiredEnv("GMAIL_USER", "حساب الإرسال", "البريد", "مطلوب لإرسال إشعارات العملاء والموظفين."),
    requiredEnv("GMAIL_APP_PASSWORD", "كلمة مرور تطبيق Gmail", "البريد", "مطلوب للإرسال عبر SMTP."),
    {
      key: "EMAIL_QUEUE_INLINE",
      category: "البريد",
      label: "تشغيل طابور البريد",
      level: valueOf("EMAIL_QUEUE_DISABLED") === "true" ? "warning" : "ready",
      value: valueOf("EMAIL_QUEUE_DISABLED") === "true" ? "معطل" : "مفعل",
      hint: "الطابور يحفظ الرسائل الفاشلة ويتيح إعادة المحاولة من الأدمن.",
    },
    optionalEnv("CRON_SECRET", "مفتاح تشغيل Cron", "البريد", "مطلوب لو هتشغل /api/email-queue/process من خدمة Cron خارجية."),
    optionalEnv("OCR_API_URL", "خدمة OCR خارجية", "OCR", "مطلوبة لقراءة الصور وملفات PDF الممسوحة ضوئيًا."),
    optionalEnv("OCR_API_KEY", "مفتاح OCR", "OCR", "اختياري حسب مزود خدمة OCR."),
    requiredEnv("ADMIN_EMAIL", "بريد المدير الأول", "الأمان", "مطلوب للتهيئة الأولى في بيئة جديدة."),
    requiredEnv("ADMIN_PASSWORD", "كلمة مرور المدير الأول", "الأمان", "استخدم كلمة مرور قوية ولا ترفعها إلى GitHub."),
    {
      key: "RATE_LIMIT_STORE",
      category: "الأمان",
      label: "Rate limit مشترك",
      level: valueOf("UPSTASH_REDIS_REST_URL") ? "ready" : "warning",
      value: valueOf("UPSTASH_REDIS_REST_URL") ? "Redis مضبوط" : "ذاكرة الخادم",
      hint: "الحالي مناسب لبداية بسيطة، لكن الإنتاج متعدد النسخ يحتاج Redis مشترك.",
    },
  ];
}

export function readinessSummary(checks: ReadinessCheck[]) {
  return {
    ready: checks.filter((check) => check.level === "ready").length,
    warning: checks.filter((check) => check.level === "warning").length,
    missing: checks.filter((check) => check.level === "missing").length,
    total: checks.length,
  };
}
