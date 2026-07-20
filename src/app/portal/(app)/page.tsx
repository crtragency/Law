import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-session";
import { prisma } from "@/lib/prisma";
import { Badge, StatCard } from "@/components/ui";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import { IconCalendar, IconFileText, IconFolder, IconScale } from "@/components/icons";

export const dynamic = "force-dynamic";

function clientName(client: { type: string; companyName?: string | null; name: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function PortalHomePage() {
  const client = await requirePortalClient();
  const now = new Date();

  const [cases, nextEvent, visibleDocumentCount, invoices, openServiceCount] = await Promise.all([
    prisma.case.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignedLawyer: { select: { name: true } },
        documents: { where: { visibility: "PORTAL" }, select: { id: true } },
        events: {
          where: { startAt: { gte: now } },
          orderBy: { startAt: "asc" },
          take: 1,
        },
      },
    }),
    prisma.event.findFirst({
      where: { case: { clientId: client.id }, startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: { case: { select: { title: true } } },
    }),
    prisma.document.count({
      where: { visibility: "PORTAL", case: { clientId: client.id } },
    }),
    prisma.invoice.findMany({
      where: { clientId: client.id, status: { notIn: ["PAID", "CANCELLED"] } },
      include: { payments: true },
      take: 100,
    }),
    prisma.serviceRequest.count({
      where: {
        clientId: client.id,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
  ]);

  const activeCases = cases.filter((c) => ["OPEN", "IN_PROGRESS", "POSTPONED"].includes(c.status)).length;
  const dueTotal = invoices.reduce((sum, invoice) => {
    const total = computeTax(invoice.amountBeforeTax, invoice.taxRate).total;
    const paid = invoice.payments.reduce((paidSum, payment) => paidSum + payment.amount, 0);
    return sum + Math.max(total - paid, 0);
  }, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-sm shadow-black/[0.035] lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-brand-700">مرحبًا، {clientName(client)}</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-ink">ملفك القانوني</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
              هنا تتابع القضايا الخاصة بك، المواعيد القادمة، المستندات المتاحة، والخطوات التي يمكن مشاركتها من المكتب.
            </p>
          </div>
          {nextEvent && (
            <div className="w-full rounded-2xl border border-brand-100 bg-brand-50/70 p-4 lg:w-[360px]">
              <p className="text-xs font-bold text-brand-800">أقرب موعد قادم</p>
              <p className="mt-1 font-semibold text-ink">{nextEvent.title}</p>
              <p className="mt-1 text-xs text-gray-500">
                {nextEvent.case?.title} - {formatDateTime(nextEvent.startAt)}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي القضايا" value={cases.length} icon={<IconFolder />} />
        <StatCard label="قضايا نشطة" value={activeCases} icon={<IconScale />} />
        <StatCard label="مستندات متاحة" value={visibleDocumentCount} icon={<IconFileText />} />
        <StatCard label="مستحقات مفتوحة" value={formatMoneyLabel(dueTotal)} icon={<IconCalendar />} />
      </div>

      {openServiceCount > 0 && (
        <div className="rounded-2xl border border-brass-100 bg-brass-50/70 p-4 text-sm text-brass-800">
          لديك {openServiceCount} طلب خدمة قيد المتابعة من المكتب.
        </div>
      )}

      <section>
        <div className="section-heading">
          <div>
            <h2 className="section-title">قضاياك</h2>
            <p className="mt-1 text-sm text-gray-500">اختر قضية لعرض التفاصيل والجلسات والمستندات.</p>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="data-panel flex flex-col items-center py-14 text-center text-gray-500">
            <IconFolder className="mb-3 h-9 w-9 text-gray-300" />
            لا توجد قضايا مسجلة حاليًا.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/portal/cases/${c.id}`}
                className="card block hover:-translate-y-0.5 hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-display text-lg font-bold text-ink">{c.title}</h3>
                    <p className="mt-1 text-xs text-gray-500" dir="ltr">{c.caseNumber}</p>
                  </div>
                  <Badge className={CASE_STATUS_COLORS[c.status]}>{CASE_STATUS_LABELS[c.status]}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-gray-600">
                  <span>{CASE_TYPE_LABELS[c.caseType]}</span>
                  {c.court && <span>{c.court}</span>}
                  {c.assignedLawyer && <span>المحامي المسؤول: {c.assignedLawyer.name}</span>}
                  <span>{c.documents.length} مستند متاح</span>
                  <span>آخر تحديث: {formatDate(c.updatedAt)}</span>
                </div>
                {c.events[0] && (
                  <div className="mt-4 rounded-xl bg-paper p-3 text-xs text-gray-500">
                    الموعد القادم: {c.events[0].title} - {formatDateTime(c.events[0].startAt)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {invoices.length > 0 && (
        <section>
          <h2 className="section-title mb-3">الفواتير المفتوحة</h2>
          <div className="data-panel divide-y divide-gray-100">
            {invoices.slice(0, 5).map((invoice) => {
              const total = computeTax(invoice.amountBeforeTax, invoice.taxRate).total;
              const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
              return (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-ink" dir="ltr">{invoice.number}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      المتبقي {formatMoneyLabel(Math.max(total - paid, 0))}
                    </p>
                  </div>
                  <Badge className={INVOICE_STATUS_COLORS[invoice.status]}>
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
