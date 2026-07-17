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
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  const now = new Date();

  const [
    caseCount,
    openCaseCount,
    clientCount,
    myTaskCount,
    upcomingEvents,
    recentCases,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.client.count(),
    prisma.task.count({
      where: { assignedToId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } },
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
        title={`أهلاً، ${user.name} 👋`}
        subtitle="نظرة سريعة على عمل المكتب اليوم"
      />
      <FlashMessage error={error} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {hasPermission(user.role, "cases.view") && (
          <StatCard
            label="إجمالي القضايا"
            value={caseCount}
            icon="📁"
            href="/cases"
          />
        )}
        {hasPermission(user.role, "cases.view") && (
          <StatCard label="قضايا نشطة" value={openCaseCount} icon="⚖️" />
        )}
        {hasPermission(user.role, "clients.view") && (
          <StatCard
            label="الموكّلون"
            value={clientCount}
            icon="👥"
            href="/clients"
          />
        )}
        {hasPermission(user.role, "tasks.view") && (
          <StatCard
            label="مهامي المفتوحة"
            value={myTaskCount}
            icon="✅"
            href="/tasks"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* المواعيد القادمة */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-gray-800">
            📅 المواعيد القادمة
          </h2>
          <div className="card divide-y divide-gray-100 p-0">
            {upcomingEvents.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد مواعيد قادمة</p>
            ) : (
              upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-4">
                  <div className="text-xl">📌</div>
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
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              📁 أحدث القضايا
            </h2>
            <div className="card divide-y divide-gray-100 p-0">
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
