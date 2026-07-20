import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail, appUrl } from "@/lib/email";

/**
 * إشعار العميل بالبريد عند وجود تحديث على إحدى قضاياه. يستخدم بريد العميل
 * الأساسي وبريد البوابة إن وُجدا، ولا يرمي استثناءً.
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
        caseNumber: true,
        client: {
          select: { email: true, portalEnabled: true, portalEmail: true },
        },
      },
    });
    if (!c?.client) return;

    const recipients = [c.client.email, c.client.portalEmail]
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => !!email);
    const uniqueRecipients = [...new Set(recipients)];
    if (uniqueRecipients.length === 0) return;

    const url = appUrl();
    const portalUrl = url && c.client.portalEnabled ? `${url}/portal/cases/${caseId}` : undefined;
    await Promise.all(
      uniqueRecipients.map((to) =>
        sendEmail({
          to,
          subject: input.subject,
          heading: input.heading,
          lines: input.lines.length ? input.lines : [`قضية: ${c.title} (${c.caseNumber})`],
          actionLabel: portalUrl ? "عرض القضية في البوابة" : undefined,
          actionUrl: portalUrl,
        })
      )
    );
  } catch (err) {
    console.error("فشل إشعار العميل:", err);
  }
}
