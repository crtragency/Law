import "server-only";

// ===========================================================================
//  تخزين الملفات — Supabase Storage (bucket خاص)
//  الرفع والتحميل يتمان بروابط موقّعة قصيرة العمر فقط؛ لا وصول عام للملفات.
// ===========================================================================

export const DOCUMENTS_BUCKET = "documents";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** هل تم ضبط متغيرات التخزين؟ */
export function storageConfigured(): boolean {
  return config() !== null;
}

const NOT_CONFIGURED_MSG =
  "رفع الملفات غير مُفعّل بعد: أضف SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في إعدادات الاستضافة";

/**
 * إنشاء رابط رفع موقّع لمسار معيّن. المتصفح يرفع الملف مباشرة إلى التخزين
 * عبر هذا الرابط (صالح لدقائق) دون المرور بحدود حجم طلبات الخادم.
 */
export async function createSignedUploadUrl(path: string): Promise<string> {
  const c = config();
  if (!c) throw new Error(NOT_CONFIGURED_MSG);

  const res = await fetch(
    `${c.url}/storage/v1/object/upload/sign/${DOCUMENTS_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`تعذّر تجهيز رابط الرفع (${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  return `${c.url}/storage/v1${data.url}`;
}

/** إنشاء رابط تحميل موقّع قصير العمر لملف مخزَّن. */
export async function createSignedDownloadUrl(
  path: string,
  expiresInSeconds = 120
): Promise<string> {
  const c = config();
  if (!c) throw new Error(NOT_CONFIGURED_MSG);

  const res = await fetch(
    `${c.url}/storage/v1/object/sign/${DOCUMENTS_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`تعذّر تجهيز رابط التحميل (${res.status})`);
  }
  const data = (await res.json()) as { signedURL: string };
  return `${c.url}/storage/v1${data.signedURL}`;
}
