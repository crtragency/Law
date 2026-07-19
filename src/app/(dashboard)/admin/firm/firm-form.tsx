"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveFirmAction, type ActionResult } from "./actions";
import type { FirmSettings } from "@/lib/firm";

const EMPTY: ActionResult = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "حفظ بيانات الشركة"}
    </button>
  );
}

function Field({
  name,
  label,
  defaultValue,
  hint,
  dir,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        className="field"
        dir={dir}
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function FirmForm({ firm }: { firm: FirmSettings }) {
  const [state, action] = useActionState(saveFirmAction, EMPTY);

  return (
    <form action={action} className="card space-y-5">
      {state.error && (
        <div className="rounded-md border border-seal-100 bg-seal-50 px-3 py-2 text-sm text-seal-700">
          {state.error}
        </div>
      )}
      {state.ok && state.success && (
        <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {state.success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            name="name"
            label="اسم الشركة الكامل *"
            defaultValue={firm.name}
            hint="مثال: شركة … للمحاماة والاستشارات القانونية"
          />
        </div>
        <Field
          name="legalForm"
          label="الشكل القانوني"
          defaultValue={firm.legalForm}
          hint="مثال: مهنية شخص واحد ذات مسؤولية محدودة"
        />
        <Field
          name="licenseNumber"
          label="رقم شهادة تسجيل الشركة المهنية"
          defaultValue={firm.licenseNumber}
          dir="ltr"
        />
        <Field name="address" label="العنوان الرئيسي (المدينة)" defaultValue={firm.address} />
        <Field name="branches" label="الفروع" defaultValue={firm.branches} hint="مثال: الرياض والخبر" />
        <Field name="phones" label="الجوالات" defaultValue={firm.phones} dir="ltr" />
        <Field name="email" label="البريد الإلكتروني" defaultValue={firm.email} dir="ltr" />
        <Field name="taxNumber" label="الرقم الضريبي للشركة" defaultValue={firm.taxNumber} dir="ltr" />
        <Field
          name="managerName"
          label="الممثّل بالتوقيع (المدير العام)"
          defaultValue={firm.managerName}
          hint="مثال: المدير العام المحامي/ …"
        />
        <Field
          name="city"
          label="مدينة الاختصاص القضائي"
          defaultValue={firm.city}
          hint="تُذكر في بند تسوية النزاعات بالعقد"
        />
      </div>

      <Submit />
    </form>
  );
}
