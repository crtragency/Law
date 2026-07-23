import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import {
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

function csvField(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasPermission(user, "attendance.manage")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const defaults = defaultAttendanceRange();
  const range = normalizeDateRange(
    parseDateKey(url.searchParams.get("start"), defaults.startKey),
    parseDateKey(url.searchParams.get("end"), defaults.endKey)
  );
  const selectedUserId = url.searchParams.get("userId") || "all";

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(selectedUserId !== "all" ? { id: selectedUserId } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  const rangeStart = workDateFromKey(range.startKey);
  const rangeEnd = workDateFromKey(range.endKey);
  const [records, approvedRequests] = users.length
    ? await Promise.all([
        prisma.attendanceRecord.findMany({
          where: {
            userId: { in: users.map((item) => item.id) },
            workDate: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          select: {
            userId: true,
            workDate: true,
            clockInAt: true,
            clockOutAt: true,
            notes: true,
          },
        }),
        prisma.employeeRequest.findMany({
          where: {
            requestedById: { in: users.map((item) => item.id) },
            status: "APPROVED",
            startDate: { lte: rangeEnd },
            OR: [{ endDate: null }, { endDate: { gte: rangeStart } }],
          },
          select: {
            requestedById: true,
            type: true,
            subject: true,
            startDate: true,
            endDate: true,
          },
        }),
      ])
    : [[], []];

  const rows = buildAttendanceRows({
    users,
    records,
    requests: approvedRequests,
    dateKeys: dateKeysBetween(range.startKey, range.endKey).reverse(),
  });

  const header = [
    "التاريخ",
    "الموظف",
    "البريد",
    "الدور",
    "الحضور",
    "الانصراف",
    "ساعات العمل",
    "دقائق التأخير",
    "دقائق الانصراف المبكر",
    "طلب معتمد",
    "الحالة",
  ];
  const csv = [
    header,
    ...rows.map((row) => [
      formatAttendanceDate(row.dateKey),
      row.user.name,
      row.user.email,
      ROLE_LABELS[row.user.role],
      formatAttendanceTime(row.record?.clockInAt),
      formatAttendanceTime(row.record?.clockOutAt),
      formatDuration(row.summary.workedMinutes),
      row.summary.lateMinutes,
      row.summary.earlyLeaveMinutes,
      row.approvedRequest?.subject ?? "",
      row.summary.statusLabel,
    ]),
  ]
    .map((line) => line.map(csvField).join(","))
    .join("\r\n");

  const fileName = `attendance-${range.startKey}-${range.endKey}.csv`;
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
