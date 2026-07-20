"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveContractAction, type ContractInput } from "./actions";
import { IconPlus, IconTrash } from "@/components/icons";

interface Option {
  id: string;
  name: string;
}

export interface ContractFormValues {
  id?: string;
  number: string;
  clientId: string;
  caseId?: string | null;
  city?: string | null;
  dateHijri?: string | null;
  dateGregorian?: string | null; // yyyy-mm-dd
  scope?: string | null;
  amountBeforeTaxRiyals: string;
  taxRate: number;
  installments: { amountRiyals: string; note: string; paid: boolean }[];
  notes?: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

const STATUS: ContractFormValues["status"][] = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودّة",
  ACTIVE: "سارية",
  COMPLETED: "منتهية",
  CANCELLED: "ملغاة",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const toNum = (s: string) => {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function ContractForm({
  values,
  clients,
  cases,
}: {
  values?: ContractFormValues;
  clients: Option[];
  cases: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ContractFormValues>(
    values ?? {
      number: "",
      clientId: "",
      caseId: "",
      city: "",
      dateHijri: "",
      dateGregorian: "",
      scope: "",
      amountBeforeTaxRiyals: "",
      taxRate: 15,
      installments: [{ amountRiyals: "", note: "", paid: false }],
      status: "DRAFT",
    }
  );

  const calc = useMemo(() => {
    const base = toNum(form.amountBeforeTaxRiyals);
    const tax = (base * form.taxRate) / 100;
    const total = base + tax;
    const allocated = form.installments.reduce(
      (s, i) => s + toNum(i.amountRiyals),
      0
    );
    return { base, tax, total, allocated, remaining: total - allocated };
  }, [form.amountBeforeTaxRiyals, form.taxRate, form.installments]);

  function set<K extends keyof ContractFormValues>(k: K, v: ContractFormValues[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setInstallment(i: number, patch: Partial<ContractFormValues["installments"][0]>) {
    setForm((f) => ({
      ...f,
      installments: f.installments.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    }));
  }

  /** توزيع الإجمالي (شامل الضريبة) بالتساوي على عدد الدفعات الحالي. */
  function autoSplit() {
    const n = form.installments.length || 1;
    const each = Math.floor((calc.total / n) * 100) / 100;
    const amounts = Array.from({ length: n }, (_, i) =>
      i === n - 1 ? +(calc.total - each * (n - 1)).toFixed(2) : each
    );
    setForm((f) => ({
      ...f,
      installments: f.installments.map((x, i) => ({
        ...x,
        amountRiyals: amounts[i] ? String(amounts[i]) : "",
      })),
    }));
  }

  function addInstallment() {
    setForm((f) => ({
      ...f,
      installments: [...f.installments, { amountRiyals: "", note: "", paid: false }],
    }));
  }
  function removeInstallment(i: number) {
    setForm((f) => ({
      ...f,
      installments: f.installments.filter((_, idx) => idx !== i),
    }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload: ContractInput = {
        id: form.id,
        number: form.number,
        clientId: form.clientId,
        caseId: form.caseId || undefined,
        city: form.city || undefined,
        dateHijri: form.dateHijri || undefined,
        dateGregorian: form.dateGregorian || undefined,
        scope: form.scope ?? "",
        amountBeforeTaxRiyals: form.amountBeforeTaxRiyals,
        taxRate: form.taxRate,
        installments: form.installments,
        notes: form.notes || undefined,
        status: form.status,
      };
      const res = await saveContractAction(payload);
      if (!res.ok) {
        setError(res.error ?? "تعذّر الحفظ");
        return;
      }
      router.push(`/contracts/${res.id}`);
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-md border border-seal-100 bg-seal-50 px-3 py-2 text-sm text-seal-700">
          {error}
        </div>
      )}

      <div className="form-panel form-grid">
        <div>
          <label className="label">رقم الاتفاقية *</label>
          <input
            className="field"
            dir="ltr"
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            placeholder="مثال: 47/73/ج"
          />
        </div>
        <div>
          <label className="label">الموكّل (الطرف الثاني) *</label>
          <select
            className="field"
            value={form.clientId}
            onChange={(e) => set("clientId", e.target.value)}
          >
            <option value="">— اختر الموكّل —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">القضية المرتبطة</label>
          <select
            className="field"
            value={form.caseId ?? ""}
            onChange={(e) => set("caseId", e.target.value)}
          >
            <option value="">— لا شيء —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الحالة</label>
          <select
            className="field"
            value={form.status}
            onChange={(e) => set("status", e.target.value as ContractFormValues["status"])}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">مدينة الإبرام</label>
          <input
            className="field"
            value={form.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder="جدة"
          />
        </div>
        <div className="form-grid">
          <div>
            <label className="label">التاريخ الهجري</label>
            <input
              className="field"
              dir="ltr"
              value={form.dateHijri ?? ""}
              onChange={(e) => set("dateHijri", e.target.value)}
              placeholder="19/09/1447هـ"
            />
          </div>
          <div>
            <label className="label">التاريخ الميلادي</label>
            <input
              type="date"
              className="field"
              dir="ltr"
              value={form.dateGregorian ?? ""}
              onChange={(e) => set("dateGregorian", e.target.value)}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">مهام الطرف الأول (المتفق عليها) *</label>
          <textarea
            className="field"
            rows={5}
            value={form.scope ?? ""}
            onChange={(e) => set("scope", e.target.value)}
            placeholder={"اكتب كل مهمة في سطر، مثال:\nالتمثيل النظامي للطرف الثاني في دعوى لدى...\nالمرافعة وحضور الجلسات وصياغة اللوائح حتى صدور حكم نهائي"}
          />
          <p className="mt-1 text-xs text-gray-400">
            كل سطر يظهر كبند مستقل في العقد.
          </p>
        </div>
      </div>

      {/* المبالغ والضريبة */}
      <div className="form-panel space-y-5">
        <h3 className="form-title">الأتعاب والضريبة</h3>
        <div className="form-grid-3">
          <div>
            <label className="label">الأتعاب قبل الضريبة (ريال)</label>
            <input
              className="field"
              dir="ltr"
              inputMode="decimal"
              value={form.amountBeforeTaxRiyals}
              onChange={(e) => set("amountBeforeTaxRiyals", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">نسبة الضريبة %</label>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              value={form.taxRate}
              onChange={(e) => set("taxRate", toNum(e.target.value))}
            />
          </div>
          <div className="rounded-2xl border border-line bg-paper/70 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">قبل الضريبة</span>
              <span className="font-medium" dir="ltr">{fmt(calc.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ضريبة ({form.taxRate}%)</span>
              <span className="font-medium" dir="ltr">{fmt(calc.tax)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-1">
              <span className="font-semibold text-ink">الإجمالي</span>
              <span className="font-bold text-brand-800" dir="ltr">{fmt(calc.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* الدفعات */}
      <div className="form-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-ink">الدفعات</h3>
          <div className="flex gap-2">
            <button type="button" onClick={autoSplit} className="btn-secondary text-xs">
              توزيع تلقائي بالتساوي
            </button>
            <button type="button" onClick={addInstallment} className="btn-secondary text-xs">
              <IconPlus className="h-4 w-4" /> دفعة
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {form.installments.map((inst, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line bg-paper/50 p-3 lg:grid-cols-[auto_minmax(160px,1fr)_minmax(240px,1.5fr)_auto] lg:items-center">
              <span className="text-xs text-gray-400">دفعة {i + 1}</span>
              <input
                className="field"
                dir="ltr"
                inputMode="decimal"
                value={inst.amountRiyals}
                onChange={(e) => setInstallment(i, { amountRiyals: e.target.value })}
                placeholder="المبلغ"
              />
              <input
                className="field"
                value={inst.note}
                onChange={(e) => setInstallment(i, { note: e.target.value })}
                placeholder="مثال: عند توقيع الاتفاقية / بعد شهر"
              />
              <button
                type="button"
                onClick={() => removeInstallment(i)}
                className="rounded-md p-2 text-seal-600 hover:bg-seal-50"
                aria-label="حذف الدفعة"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div
          className={`text-sm ${
            Math.abs(calc.remaining) < 0.01 ? "text-brand-700" : "text-brass-700"
          }`}
        >
          موزّع: <span dir="ltr">{fmt(calc.allocated)}</span> من إجمالي{" "}
          <span dir="ltr">{fmt(calc.total)}</span>
          {Math.abs(calc.remaining) >= 0.01 && (
            <> — المتبقّي غير موزّع: <span dir="ltr">{fmt(calc.remaining)}</span></>
          )}
        </div>
      </div>

      <div className="form-panel">
        <label className="label">ملاحظات داخلية (لا تظهر في العقد)</label>
        <textarea
          className="field"
          rows={2}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={submit} disabled={pending} className="btn-primary">
          {pending ? "جارٍ الحفظ..." : values?.id ? "حفظ التعديلات" : "حفظ الاتفاقية"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          إلغاء
        </button>
      </div>
    </div>
  );
}
