import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EXPENSE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import { Badge, StatCard } from "@/components/ui";
import { IconFileText, IconCheck, IconCalendar, IconUser } from "@/components/icons";
import { StatementPrintButton } from "./print-button";

export const metadata = { title: "كشف حساب موكل — نظام مكتب المحاماة" };

export default async function ClientStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("finance.view");
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { issueDate: "asc" },
        include: { case: { select: { title: true, caseNumber: true } } },
      },
      payments: {
        orderBy: { paidAt: "asc" },
        include: {
          invoice: { select: { number: true } },
        },
      },
      expenses: {
        where: { status: { not: "REJECTED" } },
        orderBy: { incurredAt: "asc" },
        include: { case: { select: { title: true, caseNumber: true } } },
      },
      cases: { select: { id: true, title: true, caseNumber: true, status: true } },
    },
  });

  if (!client) notFound();

  const displayName = client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
  const rows = [
    ...client.invoices.map((invoice) => {
      const total = computeTax(invoice.amountBeforeTax, invoice.taxRate).total;
      return {
        id: `invoice-${invoice.id}`,
        date: invoice.issueDate,
        type: "فاتورة",
        description: `فاتورة ${invoice.number}${invoice.case ? ` - ${invoice.case.caseNumber}` : ""}`,
        status: INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status,
        debit: total,
        credit: 0,
      };
    }),
    ...client.expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.incurredAt,
      type: "مصروف قضائي",
      description: `${expense.title}${expense.case ? ` - ${expense.case.caseNumber}` : ""}`,
      status: EXPENSE_STATUS_LABELS[expense.status] ?? expense.status,
      debit: expense.amount,
      credit: 0,
    })),
    ...client.payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.paidAt,
      type: "دفعة",
      description: payment.invoice
        ? `دفعة على فاتورة ${payment.invoice.number}`
        : payment.reference || "دفعة مباشرة",
      status: PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
      debit: 0,
      credit: payment.amount,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const debitTotal = rows.reduce((sum, row) => sum + row.debit, 0);
  const creditTotal = rows.reduce((sum, row) => sum + row.credit, 0);
  const balance = debitTotal - creditTotal;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/clients" className="text-sm font-semibold text-brand-700 hover:underline">
          رجوع إلى الموكلين
        </Link>
        <StatementPrintButton />
      </div>

      <section className="print-sheet rounded-2xl border border-line bg-white p-6 shadow-md shadow-black/[0.04]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-sm font-semibold text-brand-700">كشف حساب موكل</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-ink">{displayName}</h1>
            <p className="mt-2 text-sm text-gray-500">
              تاريخ الإصدار: {formatDateTime(new Date())}
            </p>
          </div>
          <div className="text-sm leading-7 text-gray-600">
            {client.email && <p dir="ltr">{client.email}</p>}
            {client.phone && <p dir="ltr">{client.phone}</p>}
            {client.address && <p>{client.address}</p>}
          </div>
        </div>

        <div className="no-print mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="القضايا" value={client.cases.length} icon={<IconUser />} />
          <StatCard label="إجمالي المدين" value={formatMoneyLabel(debitTotal)} icon={<IconFileText />} />
          <StatCard label="إجمالي الدائن" value={formatMoneyLabel(creditTotal)} icon={<IconCheck />} />
          <StatCard label="الرصيد" value={formatMoneyLabel(balance)} icon={<IconCalendar />} />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Summary label="إجمالي المدين" value={formatMoneyLabel(debitTotal)} />
          <Summary label="إجمالي الدائن" value={formatMoneyLabel(creditTotal)} />
          <Summary label="الرصيد النهائي" value={formatMoneyLabel(balance)} important />
        </div>

        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr>
                <th className="table-th">التاريخ</th>
                <th className="table-th">النوع</th>
                <th className="table-th">البيان</th>
                <th className="table-th">الحالة / الطريقة</th>
                <th className="table-th">مدين</th>
                <th className="table-th">دائن</th>
                <th className="table-th">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-td text-center text-gray-500">
                    لا توجد حركات مالية لهذا الموكل.
                  </td>
                </tr>
              ) : (
                rows.reduce<{ balance: number; nodes: React.ReactNode[] }>(
                  (acc, row) => {
                    acc.balance += row.debit - row.credit;
                    acc.nodes.push(
                      <tr key={row.id}>
                        <td className="table-td">{formatDate(row.date)}</td>
                        <td className="table-td">{row.type}</td>
                        <td className="table-td">{row.description}</td>
                        <td className="table-td">
                          <Badge className="bg-gray-100 text-gray-700">{row.status}</Badge>
                        </td>
                        <td className="table-td">{row.debit ? formatMoneyLabel(row.debit) : "—"}</td>
                        <td className="table-td">{row.credit ? formatMoneyLabel(row.credit) : "—"}</td>
                        <td className="table-td font-semibold text-ink">{formatMoneyLabel(acc.balance)}</td>
                      </tr>
                    );
                    return acc;
                  },
                  { balance: 0, nodes: [] }
                ).nodes
              )}
            </tbody>
          </table>
        </div>

        {client.cases.length > 0 && (
          <div className="mt-6">
            <h2 className="section-title mb-3">القضايا المرتبطة</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {client.cases.map((item) => (
                <div key={item.id} className="rounded-2xl border border-line bg-paper/60 p-4">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-500" dir="ltr">{item.caseNumber}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value, important = false }: { label: string; value: string; important?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${important ? "border-brand-200 bg-brand-50" : "border-line bg-paper/60"}`}>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
