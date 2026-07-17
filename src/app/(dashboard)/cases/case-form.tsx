"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { saveCaseAction, type ActionResult } from "./actions";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/labels";

const EMPTY: ActionResult = { ok: false };

export interface CaseFormValues {
  id?: string;
  caseNumber?: string;
  title?: string;
  clientId?: string;
  court?: string | null;
  caseType?: string;
  status?: string;
  assignedLawyerId?: string | null;
  description?: string | null;
}

interface Option {
  id: string;
  name: string;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export function CaseForm({
  values,
  clients,
  lawyers,
  onDone,
  onCancel,
}: {
  values?: CaseFormValues;
  clients: Option[];
  lawyers: Option[];
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, action] = useActionState(saveCaseAction, EMPTY);

  useEffect(() => {
    if (state.ok && state.success && onDone) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
  }, [state, onDone]);

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-bold">
        {values?.id ? "تعديل القضية" : "قضية جديدة"}
      </h3>
      {state.error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && state.success && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </div>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        {values?.id && <input type="hidden" name="id" value={values.id} />}
        <div>
          <label className="label">رقم القضية *</label>
          <input
            name="caseNumber"
            defaultValue={values?.caseNumber}
            required
            className="field"
            dir="ltr"
          />
        </div>
        <div>
          <label className="label">عنوان القضية *</label>
          <input
            name="title"
            defaultValue={values?.title}
            required
            className="field"
          />
        </div>
        <div>
          <label className="label">الموكّل *</label>
          <select
            name="clientId"
            defaultValue={values?.clientId ?? ""}
            required
            className="field"
          >
            <option value="" disabled>
              — اختر الموكّل —
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">المحامي المسؤول</label>
          <select
            name="assignedLawyerId"
            defaultValue={values?.assignedLawyerId ?? ""}
            className="field"
          >
            <option value="">— غير محدّد —</option>
            {lawyers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">نوع القضية</label>
          <select
            name="caseType"
            defaultValue={values?.caseType ?? "OTHER"}
            className="field"
          >
            {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الحالة</label>
          <select
            name="status"
            defaultValue={values?.status ?? "OPEN"}
            className="field"
          >
            {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">المحكمة</label>
          <input
            name="court"
            defaultValue={values?.court ?? ""}
            className="field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">تفاصيل / وصف</label>
          <textarea
            name="description"
            defaultValue={values?.description ?? ""}
            rows={3}
            className="field"
          />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <Submit label={values?.id ? "حفظ" : "إضافة القضية"} />
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              إلغاء
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
