import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

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

export interface SendInput {
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
export async function sendEmailNow(input: SendInput): Promise<boolean> {
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

function queueEnabled() {
  return process.env.EMAIL_QUEUE_DISABLED !== "true";
}

function inlineProcessingEnabled() {
  return process.env.EMAIL_QUEUE_INLINE !== "false";
}

function nextAttemptDate(attempts: number) {
  const minutes = Math.min(60, Math.max(1, 2 ** Math.max(0, attempts - 1)));
  return new Date(Date.now() + minutes * 60 * 1000);
}

function parseQueuedLines(linesJson: string): string[] {
  try {
    const parsed = JSON.parse(linesJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function enqueueEmail(input: SendInput) {
  return prisma.emailDelivery.create({
    data: {
      to: input.to.trim().toLowerCase(),
      subject: input.subject,
      heading: input.heading,
      linesJson: JSON.stringify(input.lines),
      actionLabel: input.actionLabel,
      actionUrl: input.actionUrl,
      nextAttemptAt: new Date(),
    },
  });
}

export async function processEmailQueue(options: { limit?: number; id?: string } = {}) {
  const now = new Date();
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const deliveries = await prisma.emailDelivery.findMany({
    where: options.id
      ? { id: options.id, status: { in: ["QUEUED", "FAILED"] } }
      : {
          status: { in: ["QUEUED", "FAILED"] },
          attempts: { lt: 3 },
          nextAttemptAt: { lte: now },
        },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const sending = await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENDING", attempts: { increment: 1 }, lastError: null },
    });
    const input: SendInput = {
      to: sending.to,
      subject: sending.subject,
      heading: sending.heading,
      lines: parseQueuedLines(sending.linesJson),
      actionLabel: sending.actionLabel ?? undefined,
      actionUrl: sending.actionUrl ?? undefined,
    };

    try {
      const ok = await sendEmailNow(input);
      if (!ok) throw new Error("SMTP not configured or rejected the message");
      await prisma.emailDelivery.update({
        where: { id: sending.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const lastError = err instanceof Error ? err.message : "Unknown email error";
      await prisma.emailDelivery.update({
        where: { id: sending.id },
        data: {
          status: "FAILED",
          lastError,
          nextAttemptAt: nextAttemptDate(sending.attempts),
        },
      });
    }
  }

  return { picked: deliveries.length, sent, failed };
}

/** يسجل البريد في طابور قابل لإعادة المحاولة، مع محاولة إرسال فورية افتراضيًا. */
export async function sendEmail(input: SendInput): Promise<boolean> {
  if (!queueEnabled()) return sendEmailNow(input);
  try {
    const queued = await enqueueEmail(input);
    if (inlineProcessingEnabled()) {
      await processEmailQueue({ id: queued.id, limit: 1 });
    }
    return true;
  } catch (err) {
    console.error("فشل تسجيل البريد في الطابور، سيتم محاولة الإرسال المباشر:", err);
    return sendEmailNow(input);
  }
}
