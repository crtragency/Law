// ===========================================================================
//  تحديد معدل المحاولات (Rate Limiting) — حماية من تخمين كلمات المرور
// ===========================================================================
// ملاحظة: هذا المُحدِّد يعمل في الذاكرة (in-memory). يكفي لمكتب واحد بخادم
// واحد. لو نُشر على عدّة نسخ (serverless)، استبدله بمخزن مشترك مثل Redis
// (Upstash) للحصول على تحديد دقيق عبر النسخ.

interface Attempt {
  count: number;
  firstAt: number;
  blockedUntil?: number;
}

const attempts = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5; // أقصى عدد محاولات
const WINDOW_MS = 15 * 60 * 1000; // خلال 15 دقيقة
const BLOCK_MS = 15 * 60 * 1000; // مدة الحظر بعد التجاوز

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining: number;
}

/** فحص وتسجيل محاولة. يُعرّف المفتاح عادةً بالبريد + عنوان IP. */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry) {
    attempts.set(key, { count: 1, firstAt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // ما زال محظوراً؟
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  // انتهت النافذة الزمنية؟ ابدأ من جديد.
  if (now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BLOCK_MS / 1000),
      remaining: 0,
    };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

/** إعادة تعيين العدّاد بعد تسجيل دخول ناجح. */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

// تنظيف دوري للمدخلات القديمة لتجنّب تضخّم الذاكرة.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      const expired = now - entry.firstAt > WINDOW_MS;
      const unblocked = !entry.blockedUntil || entry.blockedUntil < now;
      if (expired && unblocked) attempts.delete(key);
    }
  }, WINDOW_MS).unref?.();
}
