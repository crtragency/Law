"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { portalLoginAction, type PortalLoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
    </button>
  );
}

export function PortalLoginForm() {
  const [state, formAction] = useActionState<PortalLoginState, FormData>(
    portalLoginAction,
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
          dir="ltr"
          placeholder="you@example.com"
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
          autoComplete="current-password"
          required
          className="field"
          placeholder="••••••••"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
