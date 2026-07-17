import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — نظام مكتب المحاماة",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            ⚖️
          </div>
          <h1 className="text-2xl font-bold">نظام مكتب المحاماة</h1>
          <p className="mt-1 text-sm text-brand-100">
            سجّل الدخول للوصول إلى لوحة العمل
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-brand-200">
          الحسابات يُنشئها مدير المكتب فقط. لطلب حساب تواصل مع الإدارة.
        </p>
      </div>
    </main>
  );
}
