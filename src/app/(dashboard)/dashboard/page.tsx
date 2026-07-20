import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, FlashMessage } from "@/components/ui";
import { Badge } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  EVENT_TYPE_LABELS,
  formatDateTime,
} from "@/lib/labels";
import {
  IconFolder,
  IconScale,
  IconUsers,
  IconCheck,
  IconCalendar,
  IconFileText,
  IconShield,
  IconBuilding,
  IconBell,
} from "@/components/icons";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  const now = new Date();
  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [
    caseCount,
    openCaseCount,
    clientCount,
    myTaskCount,
    openServiceRequestCount,
    activePowerCount,
    unpaidInvoiceCount,
    upcomingReminderCount,
    upcomingEvents,
    recentCases,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.client.count(),
    prisma.task.count({
      where: { assignedToId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } },
    }),
    prisma.serviceRequest.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.powerOfAttorney.count({
      where: { status: { in: ["ACTIVE", "EXPIRING"] } },
    }),
    prisma.invoice.count({
      where: { status: { notIn: ["PAID", "CANCELLED"] } },
    }),
    prisma.reminder.count({
      where: { status: "OPEN", dueAt: { gte: now, lte: soon } },
    }),
    prisma.event.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { case: { select: { caseNumber: true, title: true } } },
    }),
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`أهلاً بك، ${user.name}`}
        subtitle={new Intl.DateTimeFormat("ar-EG", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())}
      />
      <FlashMessage error={error} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {hasPermission(user.role, "cases.view") && (
          <StatCard
            label="إجمالي القضايا"
            value={caseCount}
            icon={<IconFolder />}
            href="/cases"
          />
        )}
        {hasPermission(user.role, "cases.view") && (
          <StatCard
            label="قضايا نشطة"
            value={openCaseCount}
            icon={<IconScale />}
          />
        )}
        {hasPermission(user.role, "clients.view") && (
          <StatCard
            label="الموكّلون"
            value={clientCount}
            icon={<IconUsers />}
            href="/clients"
          />
        )}
        {hasPermission(user.role, "tasks.view") && (
          <StatCard
            label="مهامي المفتوحة"
            value={myTaskCount}
            icon={<IconCheck />}
            href="/tasks"
          />
        )}
        {hasPermission(user.role, "services.view") && (
          <StatCard
            label="طلبات خدمات مفتوحة"
            value={openServiceRequestCount}
            icon={<IconFileText />}
            href="/services"
          />
        )}
        {hasPermission(user.role, "powers.view") && (
          <StatCard
            label="توكيلات نشطة"
            value={activePowerCount}
            icon={<IconShield />}
            href="/powers"
          />
        )}
        {hasPermission(user.role, "finance.view") && (
          <StatCard
            label="فواتير غير مدفوعة"
            value={unpaidInvoiceCount}
            icon={<IconBuilding />}
            href="/finance"
          />
        )}
        {hasPermission(user.role, "reminders.view") && (
          <StatCard
            label="تنبيهات قريبة"
            value={upcomingReminderCount}
            icon={<IconBell />}
            href="/reminders"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* المواعيد القادمة */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
            <IconCalendar className="text-brand-600" /> المواعيد القادمة
          </h2>
          <div className="data-panel divide-y divide-gray-100">
            {upcomingEvents.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد مواعيد قادمة</p>
            ) : (
              upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <IconCalendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">
                        {ev.title}
                      </span>
                      <Badge className="bg-brand-50 text-brand-700">
                        {EVENT_TYPE_LABELS[ev.type]}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(ev.startAt)}
                      {ev.case && ` — ${ev.case.caseNumber}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* أحدث القضايا */}
        {hasPermission(user.role, "cases.view") && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
              <IconFolder className="text-brand-600" /> أحدث القضايا
            </h2>
            <div className="data-panel divide-y divide-gray-100">
              {recentCases.length === 0 ? (
                <p className="p-5 text-sm text-gray-500">لا توجد قضايا بعد</p>
              ) : (
                recentCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-800">{c.title}</div>
                      <div className="text-xs text-gray-500">
                        {c.caseNumber} — {c.client.name}
                      </div>
                    </div>
                    <Badge className={CASE_STATUS_COLORS[c.status]}>
                      {CASE_STATUS_LABELS[c.status]}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
