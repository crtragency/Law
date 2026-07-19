import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail, appUrl } from "@/lib/email";

/**
 * إشعار العميل بالبريد عند وجود تحديث على إحدى قضاياه — فقط إذا كانت بوابته
 * مُفعّلة وله بريد. لا يرمي استثناءً.
 */
export async function notifyClientCaseUpdate(
  caseId: string,
  input: { subject: string; heading: string; lines: string[] }
): Promise<void> {
  try {
    const c = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        title: true,
        client: {
          select: { portalEnabled: true, portalEmail: true },
        },
      },
    });
    if (!c?.client?.portalEnabled || !c.client.portalEmail) return;

    const url = appUrl();
    await sendEmail({
      to: c.client.portalEmail,
      subject: input.subject,
      heading: input.heading,
      lines: input.lines,
      actionLabel: url ? "عرض القضية في البوابة" : undefined,
      actionUrl: url ? `${url}/portal/cases/${caseId}` : undefined,
    });
  } catch (err) {
    console.error("فشل إشعار العميل:", err);
  }
}
