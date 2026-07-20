import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";
import { IconBell } from "@/components/icons";
import { markAllReadAction } from "./actions";

export const metadata = { title: "الإشعارات — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const me = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div>
      <PageHeader
        title="الإشعارات"
        subtitle="كل ما يخصّك من مهام وملاحظات ورسائل"
        action={
          hasUnread ? (
            <form action={markAllReadAction}>
              <button type="submit" className="btn-secondary">
                تعليم الكل كمقروء
              </button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center text-gray-500">
          <IconBell className="mb-3 h-8 w-8 text-gray-300" />
          لا توجد إشعارات بعد
        </div>
      ) : (
        <div className="data-panel divide-y divide-gray-100">
          {notifications.map((n) => {
            const inner = (
              <div
                className={`flex items-start gap-3 p-4 ${
                  n.read ? "" : "bg-brand-50/50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    n.read
                      ? "bg-gray-100 text-gray-400"
                      : "bg-brand-100 text-brand-600"
                  }`}
                >
                  <IconBell className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{n.title}</span>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-gray-50">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
