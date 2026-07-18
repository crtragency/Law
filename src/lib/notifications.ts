import "server-only";
import { prisma } from "@/lib/prisma";

interface NotifyInput {
  userId: string; // المستلِم
  type: string;
  title: string;
  body?: string;
  link?: string;
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
  } catch (err) {
    console.error("فشل إنشاء الإشعارات:", err);
  }
}
