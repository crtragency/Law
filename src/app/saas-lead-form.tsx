"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  createSaasLeadAction,
  type SaasLeadResult,
} from "./public-actions";
import styles from "./landing.module.css";

const EMPTY_STATE: SaasLeadResult = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.leadSubmit} disabled={pending}>
      <span>{pending ? "جاري إرسال طلبك..." : "اطلب تفعيل مكتبك"}</span>
      <ArrowLeft aria-hidden size={18} strokeWidth={2.2} />
    </button>
  );
}

export function SaasLeadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createSaasLeadAction, EMPTY_STATE);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className={styles.leadForm}>
      <div className={styles.leadGrid}>
        <label>
          <span>الاسم</span>
          <input name="contactName" required placeholder="اسم المسؤول" />
        </label>
        <label>
          <span>اسم المكتب</span>
          <input name="firmName" required placeholder="مكتب المحاماة" />
        </label>
        <label>
          <span>رقم التواصل</span>
          <input
            name="phone"
            required
            inputMode="tel"
            dir="ltr"
            placeholder="+966 5x xxx xxxx"
          />
        </label>
        <label>
          <span>البريد الإلكتروني</span>
          <input
            name="email"
            type="email"
            dir="ltr"
            placeholder="name@lawfirm.sa"
          />
        </label>
      </div>
      <label>
        <span>حجم الفريق</span>
        <select name="teamSize" defaultValue="1-5">
          <option value="1-5">من 1 إلى 5 موظفين</option>
          <option value="6-15">من 6 إلى 15 موظفًا</option>
          <option value="16-30">من 16 إلى 30 موظفًا</option>
          <option value="31+">أكثر من 30 موظفًا</option>
        </select>
      </label>

      {state.error && <p className={styles.formError}>{state.error}</p>}
      {state.success && (
        <p className={styles.formSuccess}>
          <CheckCircle2 aria-hidden size={18} />
          {state.success}
        </p>
      )}
      <SubmitButton />
      <p className={styles.formNote}>
        لا تحتاج بطاقة دفع الآن. نراجع احتياج المكتب أولًا ثم نفعّل حسابك.
      </p>
    </form>
  );
}
