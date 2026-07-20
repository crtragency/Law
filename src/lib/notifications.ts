import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail, appUrl } from "@/lib/email";

interface NotifyInput {
  userId: string; // المستلِم
  type: string;
  title: string;
  body?: string;
  link?: string;
}

function makeAbsoluteUrl(path?: string): string | undefined {
  const base = appUrl();
  if (!base || !path) return undefined;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendUserNotificationEmails(
  userIds: string[],
  data: Omit<NotifyInput, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { email: true },
    });
    const actionUrl = makeAbsoluteUrl(data.link);
    await Promise.all(
      users.map((user) =>
        sendEmail({
          to: user.email,
          subject: data.title,
          heading: data.title,
          lines: [data.body ?? "لديك إشعار جديد داخل نظام إدارة مكتب المحاماة."],
          actionLabel: actionUrl ? "فتح الإشعار" : undefined,
          actionUrl,
        })
      )
    );
  } catch (err) {
    console.error("فشل إرسال إشعار البريد للموظف:", err);
  }
}

/**
 * إنشاء إشعار لمستخدم. لا يرمي استثناءً حتى لا يعطّل العملية الأصلية،
 * ولا يُشعِر المستخدم بنفسه.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
    await sendUserNotificationEmails([input.userId], input);
  } catch (err) {
    console.error("فشل إنشاء الإشعار:", err);
  }
}

/** إنشاء إشعارات لعدة مستخدمين دفعة واحدة (يستبعد التكرار والقيم الفارغة). */
export async function notifyMany(
  userIds: (string | null | undefined)[],
  data: Omit<NotifyInput, "userId">
): Promise<void> {
  const unique = [...new Set(userIds.filter((id): id is string => !!id))];
  if (unique.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link,
      })),
    });
    await sendUserNotificationEmails(unique, data);
  } catch (err) {
    console.error("فشل إنشاء الإشعارات:", err);
  }
}
