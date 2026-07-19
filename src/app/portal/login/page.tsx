import type { Metadata } from "next";
import { IconScale } from "@/components/icons";
import { PortalLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "بوابة العميل — تسجيل الدخول",
};

export default function PortalLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <IconScale className="h-8 w-8 text-brass-300" />
          </div>
          <h1 className="font-display text-2xl font-bold">بوابة العميل</h1>
          <p className="mt-1 text-sm text-brand-100">
            تابع قضاياك ومستنداتك ومواعيد جلساتك
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <PortalLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-brand-200">
          للحصول على بيانات الدخول تواصل مع مكتب المحاماة.
        </p>
      </div>
    </main>
  );
}
