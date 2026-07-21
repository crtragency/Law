import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { IconMail } from "@/components/icons";
import {
  EMAIL_DELIVERY_STATUS_COLORS,
  EMAIL_DELIVERY_STATUS_LABELS,
  formatDateTime,
} from "@/lib/labels";
import {
  cancelEmailDeliveryFormAction,
  processEmailQueueFormAction,
  retryEmailDeliveryFormAction,
} from "./actions";

export const metadata = { title: "طابور البريد — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

const STATUSES = Object.keys(EMAIL_DELIVERY_STATUS_LABELS);

export default async function EmailQueuePage() {
  await requirePermission("audit.view");

  const [statusStats, deliveries] = await Promise.all([
    prisma.emailDelivery.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emailDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const statusMap = Object.fromEntries(statusStats.map((row) => [row.status, row._count._all]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="طابور البريد"
        subtitle="متابعة رسائل البريد، إعادة محاولة الفاشل، وتشغيل الطابور يدويًا"
        action={
          <form action={processEmailQueueFormAction}>
            <button type="submit" className="btn-primary">تشغيل الطابور الآن</button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {STATUSES.map((status) => (
          <StatCard
            key={status}
            label={EMAIL_DELIVERY_STATUS_LABELS[status]}
            value={statusMap[status] ?? 0}
            icon={<IconMail />}
          />
        ))}
      </div>

      <div className="data-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-right text-xs text-gray-500">
              <th className="table-th">المستلم</th>
              <th className="table-th">العنوان</th>
              <th className="table-th">الحالة</th>
              <th className="table-th">المحاولات</th>
              <th className="table-th">آخر خطأ</th>
              <th className="table-th">التاريخ</th>
              <th className="table-th">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">لا توجد رسائل في الطابور بعد</td>
              </tr>
            ) : deliveries.map((delivery) => (
              <tr key={delivery.id} className="border-b border-gray-100 align-top hover:bg-gray-50">
                <td className="table-td" dir="ltr">{delivery.to}</td>
                <td className="table-td">
                  <p className="font-medium text-ink">{delivery.subject}</p>
                  <p className="mt-1 text-xs text-gray-400">{delivery.heading}</p>
                </td>
                <td className="table-td">
                  <Badge className={EMAIL_DELIVERY_STATUS_COLORS[delivery.status]}>
                    {EMAIL_DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                </td>
                <td className="table-td" dir="ltr">{delivery.attempts}/{delivery.maxAttempts}</td>
                <td className="table-td max-w-xs text-xs text-seal-700">{delivery.lastError ?? "—"}</td>
                <td className="table-td text-xs text-gray-500">
                  {delivery.sentAt ? formatDateTime(delivery.sentAt) : formatDateTime(delivery.createdAt)}
                </td>
                <td className="table-td">
                  <div className="flex flex-wrap gap-2">
                    {["FAILED", "QUEUED"].includes(delivery.status) && (
                      <form action={retryEmailDeliveryFormAction}>
                        <input type="hidden" name="id" value={delivery.id} />
                        <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">إعادة</button>
                      </form>
                    )}
                    {["FAILED", "QUEUED"].includes(delivery.status) && (
                      <form action={cancelEmailDeliveryFormAction}>
                        <input type="hidden" name="id" value={delivery.id} />
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">إلغاء</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
