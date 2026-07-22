"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { saveHearingMinuteAction, type HearingActionResult } from "./actions";
import { IconPlus } from "@/components/icons";

const EMPTY: HearingActionResult = { ok: false };

interface CaseOption {
  id: string;
  title: string;
  caseNumber: string;
}

interface StepOption {
  id: string;
  title: string;
  caseNumber: string;
  caseId: string;
}

interface UserOption {
  id: string;
  name: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <IconPlus className="h-4 w-4" />
      {pending ? "جاري الحفظ..." : "حفظ محضر الجلسة"}
    </button>
  );
}

export function HearingMinuteForm({
  cases,
  steps,
  users,
}: {
  cases: CaseOption[];
  steps: StepOption[];
  users: UserOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(saveHearingMinuteAction, EMPTY);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="form-panel h-fit space-y-4">
      <div className="form-heading">
        <div>
          <h2 className="form-title">محضر جلسة سريع</h2>
          <p className="form-subtitle">
            احفظ القرار والمطلوبات، والنظام ينشئ موعد الجلسة القادمة ومهمة المتابعة تلقائياً.
          </p>
        </div>
      </div>

      <select name="caseId" required className="field" defaultValue="">
        <option value="">اختر القضية</option>
        {cases.map((item) => (
          <option key={item.id} value={item.id}>
            {item.caseNumber} - {item.title}
          </option>
        ))}
      </select>

      <select name="litigationStepId" className="field" defaultValue="">
        <option value="">ربط بخطوة تقاضي مفتوحة</option>
        {steps.map((item) => (
          <option key={item.id} value={item.id}>
            {item.caseNumber} - {item.title}
          </option>
        ))}
      </select>

      <div className="form-grid">
        <div>
          <label className="label">تاريخ الجلسة</label>
          <input name="sessionDate" type="datetime-local" required className="field" />
        </div>
        <div>
          <label className="label">الجلسة القادمة</label>
          <input name="nextSessionAt" type="datetime-local" className="field" />
        </div>
      </div>

      <div className="form-grid">
        <input name="court" className="field" placeholder="المحكمة" />
        <input name="circuit" className="field" placeholder="الدائرة" />
      </div>

      <textarea name="decision" rows={3} required className="field" placeholder="قرار الجلسة / الحكم / التأجيل..." />
      <textarea name="requirements" rows={3} className="field" placeholder="المطلوبات قبل الجلسة القادمة أو الإجراء التالي..." />

      <div>
        <label className="label">إسناد مهمة المتابعة</label>
        <select name="assignedToId" className="field" defaultValue="">
          <option value="">المحامي المسؤول أو منشئ المحضر</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <textarea name="notes" rows={2} className="field" placeholder="ملاحظات داخلية إضافية..." />

      {state.error && <p className="text-sm font-semibold text-seal-600">{state.error}</p>}
      {state.success && <p className="text-sm font-semibold text-brand-700">{state.success}</p>}
      <Submit />
    </form>
  );
}
