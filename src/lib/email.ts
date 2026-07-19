import "server-only";

// ===========================================================================
//  إرسال البريد الإلكتروني عبر Resend
//  لا يرمي استثناءً حتى لا يعطّل العملية الأصلية إذا فشل الإرسال.
// ===========================================================================

const FROM =
  process.env.EMAIL_FROM || "مكتب المحاماة <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** رابط الموقع الأساسي (للروابط داخل الرسائل). */
export function appUrl(): string {
  return (process.env.APP_URL || "").replace(/\/+$/, "");
}

interface SendInput {
  to: string;
  subject: string;
  /** نص عادي — نغلّفه بقالب HTML بسيط بالعربية. */
  heading: string;
  lines: string[];
  actionLabel?: string;
  actionUrl?: string;
}

function renderHtml(input: SendInput): string {
  const button =
    input.actionUrl && input.actionLabel
      ? `<a href="${input.actionUrl}" style="display:inline-block;background:#1F4E3E;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;margin-top:16px">${input.actionLabel}</a>`
      : "";
  const body = input.lines
    .map((l) => `<p style="margin:0 0 10px;color:#374151">${l}</p>`)
    .join("");
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f5f4ef;font-family:Tahoma,Arial,sans-serif">
    <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #e4e2d9;border-radius:12px;overflow:hidden">
      <div style="background:#16352C;color:#CDAF63;padding:18px 24px;font-weight:700;font-size:16px">⚖️ مكتب المحاماة</div>
      <div style="padding:24px">
        <h1 style="margin:0 0 14px;font-size:18px;color:#1C2521">${input.heading}</h1>
        ${body}
        ${button}
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e4e2d9;color:#9ca3af;font-size:12px">
        هذه رسالة آلية من نظام إدارة مكتب المحاماة.
      </div>
    </div>
  </body></html>`;
}

/** إرسال بريد. يُرجع true عند النجاح. لا يرمي استثناءً. */
export async function sendEmail(input: SendInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY غير مضبوط — لن يُرسل البريد.");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: input.subject,
        html: renderHtml(input),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("فشل إرسال البريد:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("خطأ أثناء إرسال البريد:", err);
    return false;
  }
}
