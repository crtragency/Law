import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ===========================================================================
//  إرسال البريد الإلكتروني عبر Gmail SMTP
//  المُرسِل هو حساب جيميل المكتب (مع اسم عرض عربي). لا يرمي استثناءً حتى لا
//  يعطّل العملية الأصلية إذا فشل الإرسال.
// ===========================================================================

const FROM_NAME = process.env.EMAIL_FROM_NAME || "مكتب المحاماة";

export function emailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** رابط الموقع الأساسي (للروابط داخل الرسائل). */
export function appUrl(): string {
  return (process.env.APP_URL || "").replace(/\/+$/, "");
}

// نعيد استخدام ناقل SMTP واحد عبر الطلبات لتقليل زمن الاتصال.
const globalForMail = globalThis as unknown as {
  mailer?: Transporter;
};

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!globalForMail.mailer) {
    globalForMail.mailer = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass: pass.replace(/\s+/g, "") },
    });
  }
  return globalForMail.mailer;
}

interface SendInput {
  to: string;
  subject: string;
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
      <div style="background:#16352C;color:#CDAF63;padding:18px 24px;font-weight:700;font-size:16px">⚖️ ${FROM_NAME}</div>
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
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("إعدادات Gmail غير مضبوطة — لن يُرسل البريد.");
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${process.env.GMAIL_USER}>`,
      to: input.to,
      subject: input.subject,
      html: renderHtml(input),
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    });
    return true;
  } catch (err) {
    console.error("فشل إرسال البريد:", err);
    return false;
  }
}
