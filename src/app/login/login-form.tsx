"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
    </button>
  );
}

export function LoginForm() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-seal-100 bg-seal-50 px-4 py-3 text-sm text-seal-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
          placeholder="name@example.com"
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          كلمة المرور
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            required
            className="field pl-11"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            aria-pressed={passwordVisible}
            title={passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute left-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-gray-400 transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          >
            {passwordVisible ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
