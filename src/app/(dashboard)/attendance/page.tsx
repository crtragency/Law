import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, StatCard } from "@/components/ui";
import { IconClock, IconFileText, IconUsers } from "@/components/icons";
import { ROLE_LABELS } from "@/lib/rbac";
import {
  attendanceToneClass,
  buildAttendanceRows,
  dateKeysBetween,
  defaultAttendanceRange,
  formatAttendanceDate,
  formatAttendanceTime,
  formatDuration,
  normalizeDateRange,
  parseDateKey,
  workDateFromKey,
} from "@/lib/attendance";

export const metadata = { title: "الحضور والانصراف — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; userId?: string }>;
}) {
  await requirePermission("attendance.manage");
  const params = await searchParams;
  const defaults = defaultAttendanceRange();
  const range = normalizeDateRange(
    parseDateKey(params.start, defaults.startKey),
    parseDateKey(params.end, defaults.endKey)
  );
  const selectedUserId = params.userId || "all";

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(selectedUserId !== "all" ? { id: selectedUserId } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  const records = users.length
    ? await prisma.attendanceRecord.findMany({
        where: {
          userId: { in: users.map((user) => user.id) },
          workDate: {
            gte: workDateFromKey(range.startKey),
            lte: workDateFromKey(range.endKey),
          },
        },
        orderBy: [{ workDate: "desc" }],
        select: {
          userId: true,
          workDate: true,
          clockInAt: true,
          clockOutAt: true,
          notes: true,
        },
      })
    : [];

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const rows = buildAttendanceRows({
    users,
    records,
    dateKeys: dateKeysBetween(range.startKey, range.endKey).reverse(),
  });

  const presentRows = rows.filter((row) => row.record?.clockInAt).length;
  const missingRows = rows.filter((row) => !row.record?.clockInAt && row.summary.statusLabel !== "لم يحن اليوم").length;
  const lateRows = rows.filter((row) => row.summary.lateMinutes > 0).length;
  const totalWorked = rows.reduce((sum, row) => sum + (row.summary.workedMinutes ?? 0), 0);
  const query = new URLSearchParams({
    start: range.startKey,
    end: range.endKey,
    ...(selectedUserId !== "all" ? { userId: selectedUserId } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور والانصراف"
        subtitle="تابع بداية ونهاية يوم كل موظف، واحسب التأخيرات والانصراف المبكر، وصدّر شيت لأي فترة تحتاجها."
        action={
          <Link href={`/attendance/export?${query}`} className="btn-primary">
            <IconFileText className="h-4 w-4" />
            تصدير شيت Excel
          </Link>
        }
      />

      <form className="glass-toolbar grid gap-3 md:grid-cols-[1fr_1fr_1.3fr_auto]" action="/attendance">
        <div>
          <label className="label">من تاريخ</label>
          <input type="date" name="start" defaultValue={range.startKey} className="field" />
        </div>
        <div>
          <label className="label">إلى تاريخ</label>
          <input type="date" name="end" defaultValue={range.endKey} className="field" />
        </div>
        <div>
          <label className="label">الموظف</label>
          <select name="userId" defaultValue={selectedUserId} className="field">
            <option value="all">كل الموظفين</option>
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-secondary w-full">
            عرض التقرير
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="سجلات حضور" value={presentRows} icon={<IconUsers />} />
        <StatCard label="لم يسجلوا حضور" value={missingRows} icon={<IconClock />} />
        <StatCard label="حالات تأخير" value={lateRows} icon={<IconClock />} />
        <StatCard label="إجمالي ساعات العمل" value={formatDuration(totalWorked)} icon={<IconFileText />} />
      </div>

      <div className="data-panel overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr>
              <th className="table-th">التاريخ</th>
              <th className="table-th">الموظف</th>
              <th className="table-th">الدور</th>
              <th className="table-th">الحضور</th>
              <th className="table-th">الانصراف</th>
              <th className="table-th">ساعات العمل</th>
              <th className="table-th">التأخير</th>
              <th className="table-th">انصراف مبكر</th>
              <th className="table-th">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-td text-center text-gray-500">
                  لا توجد بيانات لهذه الفترة
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.dateKey}-${row.user.id}`}>
                  <td className="table-td text-xs text-gray-500">{formatAttendanceDate(row.dateKey)}</td>
                  <td className="table-td">
                    <div className="font-bold text-ink">{row.user.name}</div>
                    <div className="text-xs text-gray-400" dir="ltr">{row.user.email}</div>
                  </td>
                  <td className="table-td">{ROLE_LABELS[row.user.role]}</td>
                  <td className="table-td">{formatAttendanceTime(row.record?.clockInAt)}</td>
                  <td className="table-td">{formatAttendanceTime(row.record?.clockOutAt)}</td>
                  <td className="table-td font-semibold">{formatDuration(row.summary.workedMinutes)}</td>
                  <td className="table-td">{formatDuration(row.summary.lateMinutes)}</td>
                  <td className="table-td">{formatDuration(row.summary.earlyLeaveMinutes)}</td>
                  <td className="table-td">
                    <Badge className={attendanceToneClass(row.summary.tone)}>
                      {row.summary.statusLabel}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
