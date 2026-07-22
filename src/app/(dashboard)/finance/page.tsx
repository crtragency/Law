import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, StatCard } from "@/components/ui";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_COLORS,
  EXPENSE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDate,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import { addPaymentFormAction, saveExpenseFormAction, saveInvoiceFormAction } from "./actions";
import { IconBuilding, IconCheck, IconFileText, IconPlus } from "@/components/icons";

export const metadata = { title: "المالية والمصروفات — نظام مكتب المحاماة" };

const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_LABELS);
const EXPENSE_STATUSES = Object.keys(EXPENSE_STATUS_LABELS);
const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS);
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);

export default async function FinancePage() {
  const user = await requirePermission("finance.view");
  const canManage = hasPermission(user, "finance.manage");

  const [invoices, payments, expenses, clients, cases, contracts] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, case: { select: { title: true, caseNumber: true } }, payments: true },
      take: 100,
    }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      include: { client: true, invoice: { select: { number: true } } },
      take: 100,
    }),
    prisma.judicialExpense.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, case: { select: { title: true, caseNumber: true } } },
      take: 100,
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, companyName: true, type: true } }),
    prisma.case.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, caseNumber: true }, take: 200 }),
    prisma.contract.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, number: true }, take: 200 }),
  ]);

  const invoiceTotal = invoices.reduce((sum, invoice) => sum + computeTax(invoice.amountBeforeTax, invoice.taxRate).total, 0);
  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dueTotal = Math.max(invoiceTotal - paidTotal, 0);

  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: client.type === "COMPANY" && client.companyName ? client.companyName : client.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="المالية والمصروفات" subtitle="فواتير، دفعات، ومصروفات قضائية مرتبطة بالملفات" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="إجمالي الفواتير" value={formatMoneyLabel(invoiceTotal)} icon={<IconFileText />} />
        <StatCard label="المحصّل" value={formatMoneyLabel(paidTotal)} icon={<IconCheck />} />
        <StatCard label="المستحق" value={formatMoneyLabel(dueTotal)} icon={<IconBuilding />} />
        <StatCard label="المصروفات" value={formatMoneyLabel(expenseTotal)} icon={<IconPlus />} />
      </div>

      {canManage && (
        <div className="grid gap-6 xl:grid-cols-3">
          <form action={saveInvoiceFormAction} className="form-panel h-full space-y-4">
            <h2 className="form-title">فاتورة جديدة</h2>
            <input name="number" required className="field" placeholder="رقم الفاتورة" />
            <select name="clientId" required className="field" defaultValue="">
              <option value="">اختر الموكّل</option>
              {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <select name="caseId" className="field" defaultValue="">
              <option value="">بدون قضية</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}
            </select>
            <select name="contractId" className="field" defaultValue="">
              <option value="">بدون اتفاقية</option>
              {contracts.map((c) => <option key={c.id} value={c.id}>{c.number}</option>)}
            </select>
            <div className="form-grid">
              <input name="amountBeforeTaxRiyals" required className="field" placeholder="المبلغ قبل الضريبة" dir="ltr" />
              <input name="taxRate" type="number" defaultValue={15} className="field" />
            </div>
            <div className="form-grid">
              <input name="issueDate" type="date" className="field" />
              <input name="dueDate" type="date" className="field" />
            </div>
            <select name="status" className="field" defaultValue="DRAFT">
              {INVOICE_STATUSES.map((status) => <option key={status} value={status}>{INVOICE_STATUS_LABELS[status]}</option>)}
            </select>
            <textarea name="notes" rows={2} className="field" placeholder="ملاحظات" />
            <button type="submit" className="btn-primary">إضافة فاتورة</button>
          </form>

          <form action={addPaymentFormAction} className="form-panel h-full space-y-4">
            <h2 className="form-title">تسجيل دفعة</h2>
            <select name="clientId" required className="field" defaultValue="">
              <option value="">اختر الموكّل</option>
              {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <select name="invoiceId" className="field" defaultValue="">
              <option value="">بدون فاتورة</option>
              {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}
            </select>
            <input name="amountRiyals" required className="field" placeholder="المبلغ" dir="ltr" />
            <div className="form-grid">
              <input name="paidAt" type="date" className="field" />
              <select name="method" className="field" defaultValue="BANK_TRANSFER">
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
              </select>
            </div>
            <input name="reference" className="field" placeholder="مرجع الدفع" />
            <textarea name="notes" rows={2} className="field" placeholder="ملاحظات" />
            <button type="submit" className="btn-primary">تسجيل دفعة</button>
          </form>

          <form action={saveExpenseFormAction} className="form-panel h-full space-y-4">
            <h2 className="form-title">مصروف قضائي</h2>
            <input name="title" required className="field" placeholder="عنوان المصروف" />
            <div className="form-grid">
              <select name="category" className="field" defaultValue="OTHER">
                {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABELS[cat]}</option>)}
              </select>
              <select name="status" className="field" defaultValue="PENDING">
                {EXPENSE_STATUSES.map((status) => <option key={status} value={status}>{EXPENSE_STATUS_LABELS[status]}</option>)}
              </select>
            </div>
            <input name="amountRiyals" required className="field" placeholder="المبلغ" dir="ltr" />
            <select name="clientId" className="field" defaultValue="">
              <option value="">بدون موكّل</option>
              {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <select name="caseId" className="field" defaultValue="">
              <option value="">بدون قضية</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}
            </select>
            <div className="grid gap-4 md:grid-cols-3">
              <input name="incurredAt" type="date" className="field" />
              <input name="dueDate" type="date" className="field" />
              <input name="paidAt" type="date" className="field" />
            </div>
            <input name="vendor" className="field" placeholder="الجهة/المورد" />
            <input name="receiptUrl" className="field" placeholder="رابط الإيصال" dir="ltr" />
            <textarea name="notes" rows={2} className="field" placeholder="ملاحظات" />
            <button type="submit" className="btn-primary">إضافة مصروف</button>
          </form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">الفواتير</h2>
          <div className="data-panel overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-line bg-paper/60">
                <tr><th className="table-th">الرقم</th><th className="table-th">الموكّل</th><th className="table-th">المبلغ</th><th className="table-th">الاستحقاق</th><th className="table-th">الحالة</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const { total } = computeTax(invoice.amountBeforeTax, invoice.taxRate);
                  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium" dir="ltr">{invoice.number}</td>
                      <td className="table-td">{invoice.client.type === "COMPANY" && invoice.client.companyName ? invoice.client.companyName : invoice.client.name}</td>
                      <td className="table-td text-xs" dir="ltr">{formatMoneyLabel(total)}<div className="text-gray-400">مدفوع {formatMoneyLabel(paid)}</div></td>
                      <td className="table-td text-xs text-gray-500">{formatDate(invoice.dueDate)}</td>
                      <td className="table-td"><Badge className={INVOICE_STATUS_COLORS[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">المصروفات القضائية</h2>
          <div className="data-panel overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-line bg-paper/60">
                <tr><th className="table-th">المصروف</th><th className="table-th">التصنيف</th><th className="table-th">المبلغ</th><th className="table-th">القضية</th><th className="table-th">الحالة</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{expense.title}</td>
                    <td className="table-td">{EXPENSE_CATEGORY_LABELS[expense.category]}</td>
                    <td className="table-td" dir="ltr">{formatMoneyLabel(expense.amount)}</td>
                    <td className="table-td text-xs text-gray-500">{expense.case ? `${expense.case.caseNumber} — ${expense.case.title}` : "—"}</td>
                    <td className="table-td"><Badge className={EXPENSE_STATUS_COLORS[expense.status]}>{EXPENSE_STATUS_LABELS[expense.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
