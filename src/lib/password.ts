import bcrypt from "bcryptjs";

// عدد جولات التشفير — 12 توازن جيد بين الأمان والأداء.
const SALT_ROUNDS = 12;

/** تشفير كلمة المرور قبل تخزينها. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** التحقق من كلمة المرور مقابل الهاش المخزَّن. */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * هاش وهمي صالح البنية يُحسب مرة واحدة لكل عملية. نقارن به عند عدم وجود
 * المستخدم حتى يستغرق التحقق نفس الوقت تقريباً، لمنع كشف الحسابات الموجودة
 * عبر توقيت الاستجابة (timing attack).
 */
export const DUMMY_HASH = bcrypt.hashSync("dummy-placeholder-value", SALT_ROUNDS);

/**
 * فحص قوة كلمة المرور. نطلب 8 أحرف على الأقل مع تنوّع بسيط.
 * يُرجع رسالة خطأ بالعربية أو null إذا كانت قوية.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "كلمة المرور يجب ألا تقل عن 8 أحرف";
  }
  if (password.length > 128) {
    return "كلمة المرور طويلة جداً";
  }
  const hasLetter = /[A-Za-z؀-ۿ]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return "كلمة المرور يجب أن تحتوي على حروف وأرقام معاً";
  }
  return null;
}
