import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, EmptyState, StatCard } from "@/components/ui";
import {
  DOCUMENT_REQUEST_STATUS_COLORS,
  DOCUMENT_REQUEST_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LITIGATION_STEP_STATUS_COLORS,
  LITIGATION_STEP_STATUS_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import {
  IconBell,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFileText,
  IconInbox,
} from "@/components/icons";
import { computeTax, formatMoneyLabel } from "@/lib/money";

export const metadata = { title: "أجندة اليوم — نظام مكتب المحاماة" };

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default async function DailyAgendaPage() {
  const user = await requireUser();
  const start = startOfToday();
  const tomorrow = addDays(start, 1);
  const weekEnd = addDays(start, 7);
  const taskScope = hasPermission(user, "tasks.assignOthers")
    ? {}
    : { OR: [{ assignedToId: user.id }, { createdById: user.id }] };

  const [
    todayEvents,
    overdueTasks,
    dueTodayTasks,
    litigationSessions,
    documentRequests,
    serviceRequests,
    invoices,
  ] = await Promise.all([
    hasPermission(user, "events.view")
      ? prisma.event.findMany({
          where: { startAt: { gte: start, lt: tomorrow } },
          orderBy: { startAt: "asc" },
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
        })
      : Promise.resolve([]),
    hasPermission(user, "tasks.view")
      ? prisma.task.findMany({
          where: {
            ...taskScope,
            status: { in: ["TODO", "IN_PROGRESS"] },
            dueDate: { lt: start },
          },
          orderBy: { dueDate: "asc" },
          include: {
            assignedTo: { select: { name: true } },
            case: { select: { id: true, title: true, caseNumber: true } },
          },
          take: 20,
        })
      : Promise.resolve([]),
    hasPermission(user, "tasks.view")
      ? prisma.task.findMany({
          where: {
            ...taskScope,
            status: { in: ["TODO", "IN_PROGRESS"] },
            dueDate: { gte: start, lt: tomorrow },
          },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
          include: {
            assignedTo: { select: { name: true } },
            case: { select: { id: true, title: true, caseNumber: true } },
          },
          take: 20,
        })
      : Promise.resolve([]),
    hasPermission(user, "litigation.view")
      ? prisma.litigationStep.findMany({
          where: {
            status: { notIn: ["DONE", "CANCELLED"] },
            sessionDate: { gte: start, lte: weekEnd },
          },
          orderBy: { sessionDate: "asc" },
          include: {
            assignedTo: { select: { name: true } },
            case: { select: { id: true, title: true, caseNumber: true } },
          },
          take: 20,
        })
      : Promise.resolve([]),
    hasPermission(user, "documents.view")
      ? prisma.documentRequest.findMany({
          where: {
            status: "REQUESTED",
            OR: [{ dueDate: null }, { dueDate: { lte: weekEnd } }],
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
          take: 20,
        })
      : Promise.resolve([]),
    hasPermission(user, "services.view")
      ? prisma.serviceRequest.findMany({
          where: { status: { in: ["NEW", "IN_REVIEW", "IN_PROGRESS", "WAITING_CLIENT"] } },
          orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            case: { select: { id: true, title: true, caseNumber: true } },
          },
          take: 12,
        })
      : Promise.resolve([]),
    hasPermission(user, "finance.view")
      ? prisma.invoice.findMany({
          where: {
            status: { notIn: ["PAID", "CANCELLED"] },
            OR: [{ dueDate: null }, { dueDate: { lte: weekEnd } }],
          },
          orderBy: [{ dueDate: "asc" }, { issueDate: "desc" }],
          include: {
            payments: true,
            client: { select: { name: true, companyName: true, type: true } },
          },
          take: 12,
        })
      : Promise.resolve([]),
  ]);

  const urgentCount = overdueTasks.length + documentRequests.filter((item) => item.dueDate && item.dueDate < start).length;
  const agendaEmpty =
    todayEvents.length +
      overdueTasks.length +
      dueTodayTasks.length +
      litigationSessions.length +
      documentRequests.length +
      serviceRequests.length +
      invoices.length ===
    0;

  return (
    <div className="space-y-7">
      <PageHeader
        title="أجندة اليوم"
        subtitle={new Intl.DateTimeFormat("ar-EG", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(start)}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="مواعيد اليوم" value={todayEvents.length} icon={<IconCalendar />} />
        <StatCard label="مهام متأخرة" value={overdueTasks.length} icon={<IconBell />} />
        <StatCard label="مهام اليوم" value={dueTodayTasks.length} icon={<IconCheck />} />
        <StatCard label="جلسات خلال أسبوع" value={litigationSessions.length} icon={<IconClock />} />
        <StatCard label="عاجل" value={urgentCount} icon={<IconInbox />} />
      </div>

      {agendaEmpty ? (
        <EmptyState icon={<IconCalendar />} title="اليوم هادئ ولا توجد بنود عاجلة" />
      ) : (
        <div className="grid gap-7 xl:grid-cols-2">
          <AgendaSection title="مواعيد اليوم" count={todayEvents.length} icon={<IconCalendar />}>
            {todayEvents.map((event) => (
              <AgendaItem
                key={event.id}
                title={event.title}
                href={event.case ? `/cases/${event.case.id}` : "/calendar"}
                meta={`${EVENT_TYPE_LABELS[event.type]} - ${formatDateTime(event.startAt)}`}
                body={event.case ? `${event.case.caseNumber} - ${event.case.title}` : event.location ?? undefined}
                badge="اليوم"
                badgeClass="bg-brand-50 text-brand-800"
              />
            ))}
          </AgendaSection>

          <AgendaSection title="المهام المتأخرة" count={overdueTasks.length} icon={<IconBell />}>
            {overdueTasks.map((task) => (
              <AgendaItem
                key={task.id}
                title={task.title}
                href={task.case ? `/cases/${task.case.id}` : "/tasks"}
                meta={`${TASK_PRIORITY_LABELS[task.priority]} - ${formatDate(task.dueDate)}`}
                body={task.case ? `${task.case.caseNumber} - ${task.case.title}` : task.assignedTo?.name ?? undefined}
                badge={TASK_STATUS_LABELS[task.status]}
                badgeClass={TASK_STATUS_COLORS[task.status]}
              />
            ))}
          </AgendaSection>

          <AgendaSection title="مهام اليوم" count={dueTodayTasks.length} icon={<IconCheck />}>
            {dueTodayTasks.map((task) => (
              <AgendaItem
                key={task.id}
                title={task.title}
                href={task.case ? `/cases/${task.case.id}` : "/tasks"}
                meta={`${TASK_PRIORITY_LABELS[task.priority]} - ${formatDate(task.dueDate)}`}
                body={task.description ?? task.assignedTo?.name ?? undefined}
                badge={TASK_STATUS_LABELS[task.status]}
                badgeClass={TASK_STATUS_COLORS[task.status]}
              />
            ))}
          </AgendaSection>

          <AgendaSection title="جلسات وإجراءات قريبة" count={litigationSessions.length} icon={<IconClock />}>
            {litigationSessions.map((step) => (
              <AgendaItem
                key={step.id}
                title={step.title}
                href={`/cases/${step.case.id}`}
                meta={`${step.case.caseNumber} - ${formatDateTime(step.sessionDate)}`}
                body={step.nextAction ?? step.assignedTo?.name ?? undefined}
                badge={LITIGATION_STEP_STATUS_LABELS[step.status]}
                badgeClass={LITIGATION_STEP_STATUS_COLORS[step.status]}
              />
            ))}
          </AgendaSection>

          <AgendaSection title="مستندات ناقصة" count={documentRequests.length} icon={<IconFileText />}>
            {documentRequests.map((request) => (
              <AgendaItem
                key={request.id}
                title={request.title}
                href={`/cases/${request.case.id}`}
                meta={`${request.case.caseNumber}${request.dueDate ? ` - ${formatDate(request.dueDate)}` : ""}`}
                body={request.description ?? request.category ?? undefined}
                badge={DOCUMENT_REQUEST_STATUS_LABELS[request.status]}
                badgeClass={DOCUMENT_REQUEST_STATUS_COLORS[request.status]}
              />
            ))}
          </AgendaSection>

          <AgendaSection title="طلبات عملاء مفتوحة" count={serviceRequests.length} icon={<IconInbox />}>
            {serviceRequests.map((request) => (
              <AgendaItem
                key={request.id}
                title={request.title}
                href={request.case ? `/cases/${request.case.id}` : "/services"}
                meta={request.case ? request.case.caseNumber : request.client?.name ?? "طلب عام"}
                body={request.description ?? undefined}
                badge={SERVICE_STATUS_LABELS[request.status]}
                badgeClass={SERVICE_STATUS_COLORS[request.status]}
              />
            ))}
          </AgendaSection>

          <AgendaSection title="فواتير تحتاج متابعة" count={invoices.length} icon={<IconFileText />}>
            {invoices.map((invoice) => {
              const total = computeTax(invoice.amountBeforeTax, invoice.taxRate).total;
              const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
              return (
                <AgendaItem
                  key={invoice.id}
                  title={invoice.number}
                  href="/finance"
                  meta={`${formatMoneyLabel(Math.max(total - paid, 0))}${invoice.dueDate ? ` - ${formatDate(invoice.dueDate)}` : ""}`}
                  body={invoice.client.type === "COMPANY" && invoice.client.companyName ? invoice.client.companyName : invoice.client.name}
                  badge={INVOICE_STATUS_LABELS[invoice.status]}
                  badgeClass={INVOICE_STATUS_COLORS[invoice.status]}
                />
              );
            })}
          </AgendaSection>
        </div>
      )}
    </div>
  );
}

function AgendaSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="data-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <span className="text-brand-600">{icon}</span>
          {title}
        </h2>
        <Badge className={count > 0 ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-600"}>{count}</Badge>
      </div>
      <div className="divide-y divide-gray-100">
        {count === 0 ? <p className="p-5 text-sm text-gray-500">لا توجد بنود.</p> : children}
      </div>
    </section>
  );
}

function AgendaItem({
  title,
  href,
  meta,
  body,
  badge,
  badgeClass,
}: {
  title: string;
  href: string;
  meta: string;
  body?: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <Link href={href} className="block p-4 transition hover:bg-gray-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs text-gray-500">{meta}</p>
          {body && <p className="mt-2 line-clamp-2 text-sm leading-7 text-gray-600">{body}</p>}
        </div>
        <Badge className={badgeClass}>{badge}</Badge>
      </div>
    </Link>
  );
}
