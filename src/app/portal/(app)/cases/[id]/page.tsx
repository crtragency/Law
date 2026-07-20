import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalClient } from "@/lib/portal-session";
import { prisma } from "@/lib/prisma";
import { Badge, StatCard } from "@/components/ui";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LITIGATION_STAGE_LABELS,
  LITIGATION_STEP_STATUS_COLORS,
  LITIGATION_STEP_STATUS_LABELS,
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import { IconCalendar, IconCheck, IconFileText, IconFolder } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PortalCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const client = await requirePortalClient();
  const { id } = await params;

  const c = await prisma.case.findFirst({
    where: { id, clientId: client.id },
    include: {
      assignedLawyer: { select: { name: true } },
      documents: {
        where: { visibility: "PORTAL" },
        orderBy: { createdAt: "desc" },
      },
      events: { orderBy: { startAt: "asc" } },
      litigationSteps: {
        orderBy: [{ sessionDate: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { payments: true },
      },
    },
  });

  if (!c) notFound();

  const now = new Date();
  const nextEvent = c.events.find((event) => event.startAt >= now);
  const invoiceTotal = c.invoices.reduce((sum, invoice) => sum + computeTax(invoice.amountBeforeTax, invoice.taxRate).total, 0);
  const paidTotal = c.invoices.reduce(
    (sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + payment.amount, 0),
    0,
  );
  const openSteps = c.litigationSteps.filter((step) => !["DONE", "CANCELLED"].includes(step.status)).length;

  const timeline = [
    ...c.events.map((event) => ({
      id: `event-${event.id}`,
      date: event.startAt,
      title: event.title,
      subtitle: event.location ?? EVENT_TYPE_LABELS[event.type],
      badge: EVENT_TYPE_LABELS[event.type],
      badgeClass: EVENT_TYPE_COLORS[event.type],
      body: event.notes,
    })),
    ...c.litigationSteps.map((step) => ({
      id: `step-${step.id}`,
      date: step.sessionDate ?? step.dueDate ?? step.createdAt,
      title: step.title,
      subtitle: LITIGATION_STAGE_LABELS[step.stage],
      badge: LITIGATION_STEP_STATUS_LABELS[step.status],
      badgeClass: LITIGATION_STEP_STATUS_COLORS[step.status],
      body: step.outcome ?? step.nextAction,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-8">
      <div>
        <Link href="/portal" className="text-sm font-semibold text-brand-700 hover:underline">
          رجوع إلى قضاياك
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{c.title}</h1>
            <p className="mt-1 text-sm text-gray-500" dir="ltr">{c.caseNumber}</p>
          </div>
          <Badge className={CASE_STATUS_COLORS[c.status]}>{CASE_STATUS_LABELS[c.status]}</Badge>
        </div>
        <div className="rule-double mt-5" aria-hidden />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="حالة القضية" value={CASE_STATUS_LABELS[c.status]} icon={<IconFolder />} />
        <StatCard label="مستندات متاحة" value={c.documents.length} icon={<IconFileText />} />
        <StatCard label="إجراءات مفتوحة" value={openSteps} icon={<IconCheck />} />
        <StatCard label="المتبقي المالي" value={formatMoneyLabel(Math.max(invoiceTotal - paidTotal, 0))} icon={<IconCalendar />} />
      </div>

      {nextEvent && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
          <p className="text-xs font-bold text-brand-800">الموعد القادم</p>
          <p className="mt-1 font-semibold text-ink">{nextEvent.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            {formatDateTime(nextEvent.startAt)}
            {nextEvent.location ? ` - ${nextEvent.location}` : ""}
          </p>
        </div>
      )}

      <section className="form-panel form-grid lg:grid-cols-4">
        <Info label="نوع القضية" value={CASE_TYPE_LABELS[c.caseType]} />
        <Info label="المحكمة" value={c.court ?? "غير محدد"} />
        <Info label="المحامي المسؤول" value={c.assignedLawyer?.name ?? "غير محدد"} />
        <Info label="تاريخ الفتح" value={formatDate(c.openedAt)} />
        {c.description && (
          <div className="lg:col-span-4">
            <div className="label">وصف القضية</div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{c.description}</p>
          </div>
        )}
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <h2 className="section-title mb-3">الخط الزمني للقضية</h2>
          <div className="data-panel divide-y divide-gray-100">
            {timeline.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد مواعيد أو إجراءات منشورة حتى الآن.</p>
            ) : (
              timeline.map((item) => (
                <div key={item.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.subtitle} - {formatDateTime(item.date)}
                      </p>
                    </div>
                    <Badge className={item.badgeClass}>{item.badge}</Badge>
                  </div>
                  {item.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">{item.body}</p>}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">المستندات</h2>
          <div className="data-panel divide-y divide-gray-100">
            {c.documents.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد مستندات متاحة للعرض.</p>
            ) : (
              c.documents.map((document) => {
                const isExternal = /^https?:\/\//i.test(document.storageKey);
                const href = isExternal ? document.storageKey : `/api/portal/documents/${document.id}`;
                return (
                  <a
                    key={document.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 text-brand-700 transition hover:bg-gray-50"
                  >
                    <IconFileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate font-medium">{document.title}</span>
                    <span className="text-xs text-gray-400">{formatDate(document.createdAt)}</span>
                  </a>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">طلبات الخدمات المرتبطة</h2>
          <div className="data-panel divide-y divide-gray-100">
            {c.serviceRequests.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد طلبات خدمات مرتبطة بهذه القضية.</p>
            ) : (
              c.serviceRequests.map((request) => (
                <div key={request.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-ink">{request.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {SERVICE_AREA_LABELS[request.serviceArea]}
                      {request.dueDate ? ` - استحقاق ${formatDate(request.dueDate)}` : ""}
                    </p>
                  </div>
                  <Badge className={SERVICE_STATUS_COLORS[request.status]}>
                    {SERVICE_STATUS_LABELS[request.status]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">الفواتير والمدفوعات</h2>
          <div className="data-panel divide-y divide-gray-100">
            {c.invoices.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">لا توجد فواتير مرتبطة بهذه القضية.</p>
            ) : (
              c.invoices.map((invoice) => {
                const total = computeTax(invoice.amountBeforeTax, invoice.taxRate).total;
                const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
                return (
                  <div key={invoice.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink" dir="ltr">{invoice.number}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          الإجمالي {formatMoneyLabel(total)} - المدفوع {formatMoneyLabel(paid)}
                        </p>
                      </div>
                      <Badge className={INVOICE_STATUS_COLORS[invoice.status]}>
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </Badge>
                    </div>
                    {invoice.dueDate && (
                      <p className="mt-2 text-xs text-gray-400">تاريخ الاستحقاق: {formatDate(invoice.dueDate)}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}
