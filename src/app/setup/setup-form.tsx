"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setupAction, type SetupState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "جارٍ الإنشاء..." : "إنشاء حساب المدير والدخول"}
    </button>
  );
}

export function SetupForm() {
  const [state, formAction] = useActionState<SetupState, FormData>(
    setupAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="label">
          اسمك الكامل
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="field"
          placeholder="مثال: أحمد محمد"
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          البريد الإلكتروني (للدخول)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
          placeholder="admin@example.com"
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field"
          placeholder="8 أحرف على الأقل، حروف وأرقام"
        />
        <p className="mt-1 text-xs text-gray-500">
          اختر كلمة مرور قوية — دي بتحمي كل بيانات المكتب.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
