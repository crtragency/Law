"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { IconPen, IconPlus, IconTrash } from "@/components/icons";
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import { deleteSettlementOfferAction, saveSettlementOfferAction, type ActionResult } from "./actions";

const EMPTY: ActionResult = { ok: false };
const STATUSES = Object.keys(SETTLEMENT_STATUS_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  caseNumber: string;
  clientId: string;
}

export interface SettlementRow {
  id: string;
  title: string;
  status: string;
  offeredBy: string | null;
  amountBeforeTax: number | null;
  taxRate: number;
  terms: string;
  offerDate: string;
  responseDueAt: string | null;
  signedAt: string | null;
  clientId: string | null;
  clientName: string | null;
  caseId: string;
  caseTitle: string;
  caseNumber: string;
  assignedToId: string | null;
  assignedName: string | null;
  notes: string | null;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function amountToRiyals(value?: number | null) {
  if (!value) return "";
  return String(value / 100);
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <IconPlus className="h-4 w-4" />
      {pending ? "جاري الحفظ..." : editing ? "حفظ التعديل" : "تسجيل عرض"}
    </button>
  );
}

export function SettlementsManager({
  rows,
  clients,
  cases,
  users,
  canManage,
}: {
  rows: SettlementRow[];
  clients: Option[];
  cases: CaseOption[];
  users: Option[];
  canManage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<SettlementRow | null>(null);
  const [amountPreview, setAmountPreview] = useState("");
  const [taxRatePreview, setTaxRatePreview] = useState(15);
  const [state, action] = useActionState(saveSettlementOfferAction, EMPTY);
  const preview = useMemo(() => {
    const amount = Number(amountPreview || 0) * 100;
    return computeTax(Number.isFinite(amount) ? Math.round(amount) : 0, taxRatePreview || 0);
  }, [amountPreview, taxRatePreview]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setEditing(null);
      setAmountPreview("");
      setTaxRatePreview(15);
    }
  }, [state.ok]);

  function startEdit(row: SettlementRow) {
    setEditing(row);
    setAmountPreview(amountToRiyals(row.amountBeforeTax));
    setTaxRatePreview(row.taxRate);
  }

  return (
    <div className="workspace-grid">
      {canManage && (
        <form ref={formRef} action={action} className="form-panel h-fit space-y-4">
          <div className="form-heading">
            <div>
              <h2 className="form-title">{editing ? "تعديل تسوية" : "عرض تسوية"}</h2>
              <p className="form-subtitle">سجل شروط العرض ومهلة الرد، والنظام يحسب الضريبة والإجمالي ويتابع الموعد كمهمة.</p>
            </div>
          </div>
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input name="title" required className="field" placeholder="عنوان العرض أو التسوية" defaultValue={editing?.title ?? ""} />
          <div className="form-grid">
            <select name="status" className="field" defaultValue={editing?.status ?? "PROPOSED"}>
              {STATUSES.map((status) => <option key={status} value={status}>{SETTLEMENT_STATUS_LABELS[status]}</option>)}
            </select>
            <input name="offeredBy" className="field" placeholder="مقدم العرض" defaultValue={editing?.offeredBy ?? ""} />
          </div>
          <select name="caseId" required className="field" defaultValue={editing?.caseId ?? ""}>
            <option value="">اختر القضية</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} - {item.name}</option>)}
          </select>
          <select name="clientId" className="field" defaultValue={editing?.clientId ?? ""}>
            <option value="">العميل من القضية تلقائيًا</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <div className="form-grid">
            <input
              name="amountBeforeTaxRiyals"
              className="field"
              placeholder="المبلغ قبل الضريبة"
              inputMode="decimal"
              value={amountPreview}
              onChange={(event) => setAmountPreview(event.target.value)}
            />
            <input
              name="taxRate"
              type="number"
              min="0"
              max="100"
              className="field"
              placeholder="نسبة الضريبة"
              value={taxRatePreview}
              onChange={(event) => setTaxRatePreview(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2 rounded-xl border border-line bg-paper/60 p-3 text-xs text-gray-600 sm:grid-cols-3">
            <span>قبل الضريبة: {formatMoneyLabel(preview.beforeTax)}</span>
            <span>الضريبة: {formatMoneyLabel(preview.tax)}</span>
            <span className="font-semibold text-brand-800">الإجمالي: {formatMoneyLabel(preview.total)}</span>
          </div>
          <div className="form-grid">
            <input name="offerDate" type="date" className="field" defaultValue={toDateInput(editing?.offerDate) || toDateInput(new Date().toISOString())} />
            <input name="responseDueAt" type="datetime-local" className="field" defaultValue={toInputDate(editing?.responseDueAt)} />
          </div>
          <input name="signedAt" type="date" className="field" defaultValue={toDateInput(editing?.signedAt)} />
          <select name="assignedToId" className="field" defaultValue={editing?.assignedToId ?? ""}>
            <option value="">المسؤول عن المتابعة</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <textarea name="terms" rows={5} required className="field" placeholder="شروط التسوية، الالتزامات، مواعيد السداد، التنازلات..." defaultValue={editing?.terms ?? ""} />
          <textarea name="notes" rows={2} className="field" placeholder="ملاحظات تفاوض داخلية" defaultValue={editing?.notes ?? ""} />
          {state.error && <p className="text-sm font-semibold text-seal-600">{state.error}</p>}
          {state.success && <p className="text-sm font-semibold text-brand-700">{state.success}</p>}
          <div className="flex flex-wrap gap-2">
            <SubmitButton editing={!!editing} />
            {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setAmountPreview(""); setTaxRatePreview(15); formRef.current?.reset(); }}>إلغاء التعديل</button>}
          </div>
        </form>
      )}

      <div className={canManage ? "" : "lg:col-span-2"}>
        <div className="data-panel divide-y divide-gray-100">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">لا توجد عروض تسوية بعد</div>
          ) : rows.map((row) => {
            const totals = row.amountBeforeTax === null ? null : computeTax(row.amountBeforeTax, row.taxRate);
            return (
              <article key={row.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{row.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">{row.caseNumber} - {row.caseTitle} - {formatDate(row.offerDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={SETTLEMENT_STATUS_COLORS[row.status]}>{SETTLEMENT_STATUS_LABELS[row.status]}</Badge>
                    {canManage && (
                      <>
                        <button type="button" className="rounded-lg p-2 text-brand-700 hover:bg-brand-50" aria-label="تعديل" onClick={() => startEdit(row)}>
                          <IconPen className="h-4 w-4" />
                        </button>
                        <DeleteSettlement id={row.id} />
                      </>
                    )}
                  </div>
                </div>
                {totals && (
                  <div className="mb-3 grid gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-3">
                    <span>قبل الضريبة: {formatMoneyLabel(totals.beforeTax)}</span>
                    <span>الضريبة: {formatMoneyLabel(totals.tax)}</span>
                    <span className="font-semibold text-brand-800">الإجمالي: {formatMoneyLabel(totals.total)}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{row.terms}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  {row.offeredBy && <span>مقدم العرض: {row.offeredBy}</span>}
                  {row.clientName && <span>{row.clientName}</span>}
                  {row.assignedName && <span>المسؤول: {row.assignedName}</span>}
                  {row.responseDueAt && <span>مهلة الرد: {formatDateTime(row.responseDueAt)}</span>}
                  {row.signedAt && <span>التوقيع: {formatDate(row.signedAt)}</span>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeleteSettlement({ id }: { id: string }) {
  const [, action] = useActionState(deleteSettlementOfferAction, EMPTY);
  return (
    <form action={action} onSubmit={(event) => { if (!confirm("حذف عرض التسوية؟")) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}
