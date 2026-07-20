import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import {
  IconBell,
  IconBuilding,
  IconClock,
  IconFileText,
  IconFolder,
  IconGavel,
  IconScale,
  IconUsers,
} from "@/components/icons";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LITIGATION_STAGE_LABELS,
  LITIGATION_STEP_STATUS_COLORS,
  LITIGATION_STEP_STATUS_LABELS,
  REMINDER_TYPE_LABELS,
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";

export const metadata = { title: "التقارير والتحليلات — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

function toCountMap<T extends string>(rows: { [key: string]: unknown; _count: { _all: number } }[], key: string) {
  return Object.fromEntries(rows.map((row) => [row[key] as T, row._count._all])) as Record<T, number>;
}

export default async function ReportsPage() {
  await requirePermission("reports.view");

  const now = new Date();
  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [
    clientCount,
    caseStats,
    taskStats,
    serviceStatusStats,
    serviceAreaStats,
    invoiceStats,
    invoices,
    paymentTotals,
    expenseTotals,
    activePowers,
    expiringPowers,
    upcomingLitigation,
    upcomingReminders,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.case.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ["serviceArea"], _count: { _all: true } }),
    prisma.invoice.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.invoice.findMany({
      select: {
        id: true,
        number: true,
        status: true,
        dueDate: true,
        amountBeforeTax: true,
        taxRate: true,
        client: { select: { name: true, companyName: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.judicialExpense.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
    prisma.powerOfAttorney.count({ where: { status: { in: ["ACTIVE", "EXPIRING"] } } }),
    prisma.powerOfAttorney.count({
      where: { status: { in: ["ACTIVE", "EXPIRING"] }, expiresAt: { gte: now, lte: soon } },
    }),
    prisma.litigationStep.findMany({
      where: {
        status: { notIn: ["DONE", "CANCELLED"] },
        OR: [{ sessionDate: { gte: now, lte: soon } }, { dueDate: { gte: now, lte: soon } }],
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: [{ sessionDate: "asc" }, { dueDate: "asc" }],
      take: 10,
    }),
    prisma.reminder.findMany({
      where: { status: "OPEN", dueAt: { gte: now, lte: soon } },
      include: { user: { select: { name: true } }, case: { select: { title: true, caseNumber: true } } },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
  ]);

  const caseMap = toCountMap(caseStats, "status");
  const taskMap = toCountMap(taskStats, "status");
  const serviceStatusMap = toCountMap(serviceStatusStats, "status");
  const serviceAreaMap = toCountMap(serviceAreaStats, "serviceArea");
  const invoiceMap = toCountMap(invoiceStats, "status");
  const openCases = (caseMap.OPEN ?? 0) + (caseMap.IN_PROGRESS ?? 0) + (caseMap.POSTPONED ?? 0);
  const openTasks = (taskMap.TODO ?? 0) + (taskMap.IN_PROGRESS ?? 0);
  const openServices =
    (serviceStatusMap.NEW ?? 0) +
    (serviceStatusMap.IN_REVIEW ?? 0) +
    (serviceStatusMap.IN_PROGRESS ?? 0) +
    (serviceStatusMap.WAITING_CLIENT ?? 0);
  const invoiceTotal = invoices.reduce((sum, invoice) => sum + computeTax(invoice.amountBeforeTax, invoice.taxRate).total, 0);
  const paidTotal = paymentTotals._sum.amount ?? 0;
  const expenseTotal = expenseTotals._sum.amount ?? 0;
  const dueTotal = Math.max(invoiceTotal - paidTotal, 0);
  const overdueInvoices = invoices.filter(
    (invoice) => invoice.dueDate && invoice.dueDate < now && !["PAID", "CANCELLED"].includes(invoice.status),
  );

  return (
    <div className="space-y-7">
      <PageHeader
        title="التقارير والتحليلات"
        subtitle="رؤية تنفيذية لحركة القضايا، الخدمات، المهام، التوكيلات، والتحصيل المالي"
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="الموكلون" value={clientCount} icon={<IconUsers />} href="/clients" />
        <StatCard label="قضايا مفتوحة" value={openCases} icon={<IconScale />} href="/cases" />
        <StatCard label="مهام مفتوحة" value={openTasks} icon={<IconClock />} href="/tasks" />
        <StatCard label="طلبات خدمات مفتوحة" value={openServices} icon={<IconFileText />} href="/services" />
        <StatCard label="توكيلات نشطة" value={activePowers} icon={<IconGavel />} href="/powers" />
        <StatCard label="توكيلات خلال 14 يوم" value={expiringPowers} icon={<IconBell />} href="/reminders" />
        <StatCard label="المستحق المالي" value={formatMoneyLabel(dueTotal)} icon={<IconBuilding />} href="/finance" />
        <StatCard label="المصروفات" value={formatMoneyLabel(expenseTotal)} icon={<IconFolder />} href="/finance" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportSection title="حالات القضايا">
          {Object.keys(CASE_STATUS_LABELS).map((status) => (
            <MetricRow
              key={status}
              label={CASE_STATUS_LABELS[status]}
              value={caseMap[status] ?? 0}
              badgeClass={CASE_STATUS_COLORS[status]}
            />
          ))}
        </ReportSection>

        <ReportSection title="حالات المهام">
          {Object.keys(TASK_STATUS_LABELS).map((status) => (
            <MetricRow
              key={status}
              label={TASK_STATUS_LABELS[status]}
              value={taskMap[status] ?? 0}
              badgeClass={TASK_STATUS_COLORS[status]}
            />
          ))}
        </ReportSection>

        <ReportSection title="طلبات الخدمات حسب الحالة">
          {Object.keys(SERVICE_STATUS_LABELS).map((status) => (
            <MetricRow
              key={status}
              label={SERVICE_STATUS_LABELS[status]}
              value={serviceStatusMap[status] ?? 0}
              badgeClass={SERVICE_STATUS_COLORS[status]}
            />
          ))}
        </ReportSection>

        <ReportSection title="طلبات الخدمات حسب الوحدة">
          {Object.keys(SERVICE_AREA_LABELS).map((area) => (
            <MetricRow key={area} label={SERVICE_AREA_LABELS[area]} value={serviceAreaMap[area] ?? 0} />
          ))}
        </ReportSection>

        <ReportSection title="حالات الفواتير">
          {Object.keys(INVOICE_STATUS_LABELS).map((status) => (
            <MetricRow
              key={status}
              label={INVOICE_STATUS_LABELS[status]}
              value={invoiceMap[status] ?? 0}
              badgeClass={INVOICE_STATUS_COLORS[status]}
            />
          ))}
        </ReportSection>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">ملخص مالي</h2>
          <div className="card divide-y divide-gray-100 p-0">
            <FinanceRow label="إجمالي الفواتير" value={formatMoneyLabel(invoiceTotal)} />
            <FinanceRow label="إجمالي التحصيل" value={formatMoneyLabel(paidTotal)} />
            <FinanceRow label="المتبقي للتحصيل" value={formatMoneyLabel(dueTotal)} />
            <FinanceRow label="مصروفات قضائية" value={formatMoneyLabel(expenseTotal)} />
            <FinanceRow label="فواتير متأخرة" value={`${overdueInvoices.length}`} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">إجراءات التقاضي خلال 14 يوم</h2>
          <div className="card divide-y divide-gray-100 p-0">
            {upcomingLitigation.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد إجراءات قريبة</p>
            ) : (
              upcomingLitigation.map((step) => (
                <Link key={step.id} href={`/cases/${step.caseId}`} className="block p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{step.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {step.case.caseNumber} — {step.case.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {LITIGATION_STAGE_LABELS[step.stage]} — {formatDateTime(step.sessionDate ?? step.dueDate)}
                      </p>
                    </div>
                    <Badge className={LITIGATION_STEP_STATUS_COLORS[step.status]}>
                      {LITIGATION_STEP_STATUS_LABELS[step.status]}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">تنبيهات قادمة</h2>
          <div className="card divide-y divide-gray-100 p-0">
            {upcomingReminders.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد تنبيهات قريبة</p>
            ) : (
              upcomingReminders.map((reminder) => (
                <Link key={reminder.id} href={reminder.link ?? "/reminders"} className="block p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{reminder.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {REMINDER_TYPE_LABELS[reminder.type]} — {formatDateTime(reminder.dueAt)}
                      </p>
                      {reminder.case && (
                        <p className="mt-1 text-xs text-gray-400">
                          {reminder.case.caseNumber} — {reminder.case.title}
                        </p>
                      )}
                    </div>
                    {reminder.user && <Badge className="bg-gray-100 text-gray-700">{reminder.user.name}</Badge>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{title}</h2>
      <div className="card divide-y divide-gray-100 p-0">{children}</div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  badgeClass = "bg-gray-100 text-gray-700",
}: {
  label: string;
  value: number;
  badgeClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <Badge className={badgeClass}>{label}</Badge>
      <span className="font-display text-xl font-bold text-ink">{value}</span>
    </div>
  );
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-semibold text-ink" dir="ltr">
        {value}
      </span>
    </div>
  );
}
