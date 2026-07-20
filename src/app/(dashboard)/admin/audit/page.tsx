import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";

export const metadata = { title: "سجل التدقيق — نظام مكتب المحاماة" };

// أسماء عربية للأحداث الشائعة.
const ACTION_LABELS: Record<string, string> = {
  "user.login": "تسجيل دخول",
  "user.logout": "تسجيل خروج",
  "user.login.failed": "محاولة دخول فاشلة",
  "user.create": "إنشاء حساب موظف",
  "user.update": "تعديل موظف",
  "user.password_reset": "إعادة تعيين كلمة مرور",
  "client.create": "إضافة موكّل",
  "client.update": "تعديل موكّل",
  "client.delete": "حذف موكّل",
  "case.create": "إضافة قضية",
  "case.update": "تعديل قضية",
  "case.delete": "حذف قضية",
  "case.note.add": "إضافة ملاحظة لقضية",
  "document.add": "إضافة مستند",
  "document.delete": "حذف مستند",
  "task.create": "إضافة مهمة",
  "task.update": "تعديل مهمة",
  "task.status": "تغيير حالة مهمة",
  "event.create": "إضافة موعد",
  "event.update": "تعديل موعد",
  "event.delete": "حذف موعد",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission("audit.view");
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const pageSize = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        subtitle={`سجل بكل العمليات الحساسة في النظام — ${total} حدث`}
      />
      <div className="data-panel overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="table-th">التاريخ</th>
              <th className="table-th">المستخدم</th>
              <th className="table-th">الحدث</th>
              <th className="table-th">التفاصيل</th>
              <th className="table-th">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-gray-500">
                  لا توجد سجلات بعد
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="table-td whitespace-nowrap text-xs text-gray-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="table-td">
                    {log.user?.name ?? "—"}
                  </td>
                  <td className="table-td">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="table-td text-xs text-gray-500" dir="ltr">
                    {log.details ?? "—"}
                  </td>
                  <td className="table-td text-xs text-gray-400" dir="ltr">
                    {log.ip ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {pageNum > 1 && (
            <a href={`/admin/audit?page=${pageNum - 1}`} className="btn-secondary">
              السابق
            </a>
          )}
          <span className="text-sm text-gray-500">
            صفحة {pageNum} من {totalPages}
          </span>
          {pageNum < totalPages && (
            <a href={`/admin/audit?page=${pageNum + 1}`} className="btn-secondary">
              التالي
            </a>
          )}
        </div>
      )}
    </div>
  );
}
