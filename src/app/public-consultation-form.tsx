"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createPublicConsultationAction,
  type PublicConsultationResult,
} from "./public-actions";
import { IconSend } from "@/components/icons";

const EMPTY: PublicConsultationResult = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full justify-center" disabled={pending}>
      <IconSend className="h-4 w-4" />
      {pending ? "جاري الإرسال..." : "إرسال طلب الاستشارة"}
    </button>
  );
}

export function PublicConsultationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createPublicConsultationAction, EMPTY);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-white/75">الاسم</label>
          <input name="requesterName" required className="field" placeholder="اسم طالب الاستشارة" />
        </div>
        <div>
          <label className="label text-white/75">رقم التواصل</label>
          <input name="requesterPhone" required className="field" dir="ltr" placeholder="+966..." />
        </div>
      </div>
      <div>
        <label className="label text-white/75">البريد الإلكتروني</label>
        <input name="requesterEmail" type="email" className="field" dir="ltr" placeholder="client@example.com" />
      </div>
      <div>
        <label className="label text-white/75">موضوع الاستشارة</label>
        <input name="title" required className="field" placeholder="مثال: مراجعة عقد أو نزاع تجاري" />
      </div>
      <div>
        <label className="label text-white/75">التفاصيل</label>
        <textarea
          name="question"
          required
          rows={5}
          className="field"
          placeholder="اكتب ملخصاً واضحاً للموضوع والموعد أو المستندات المهمة..."
        />
      </div>
      {state.error && (
        <p className="rounded-xl border border-seal-200 bg-seal-50 px-3 py-2 text-sm font-semibold text-seal-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
          {state.success}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
