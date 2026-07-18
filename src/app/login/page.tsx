import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { IconScale } from "@/components/icons";

export const metadata: Metadata = {
  title: "تسجيل الدخول — نظام مكتب المحاماة",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-paper lg:grid lg:grid-cols-[5fr_4fr]">
      {/* اللوحة التعريفية — تظهر على الشاشات الكبيرة */}
      <section className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* ميزان كبير خطّي كعنصر خلفي هادئ */}
        <IconScale
          aria-hidden
          className="pointer-events-none absolute -left-12 top-1/2 h-[380px] w-[380px] -translate-y-1/2 text-brass-400 opacity-[0.06]"
          strokeWidth={1}
        />

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.06] text-brass-300">
            <IconScale className="h-[22px] w-[22px]" />
          </span>
          <span className="font-display text-[15px] font-bold">
            مكتب المحاماة
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 text-sm font-medium text-brass-300">
            نظام إدارة مكتب المحاماة
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.35]">
            القضايا والجلسات والفريق —
            <br />
            في سجلٍّ واحد منظّم.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-brand-200">
            تابع ملفات القضايا، ووزّع المهام على الفريق، ولا تفوّت موعد جلسة.
          </p>
        </div>

        <div className="relative">
          <div className="mb-4 max-w-md" aria-hidden>
            <div className="border-t-2 border-brass-400/50" />
            <div className="mt-[3px] border-t border-brass-400/20" />
          </div>
          <p className="text-[13px] text-brand-300">
            الحسابات تُنشأ بواسطة إدارة المكتب فقط — بياناتك محفوظة ومشفّرة.
          </p>
        </div>
      </section>

      {/* نموذج الدخول */}
      <section className="flex min-h-screen items-center justify-center p-6 lg:min-h-0 lg:p-12">
        <div className="w-full max-w-sm">
          {/* علامة مختصرة للموبايل */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-950 text-brass-300">
              <IconScale className="h-[22px] w-[22px]" />
            </span>
            <span className="font-display font-bold text-ink">
              مكتب المحاماة
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink">
            تسجيل الدخول
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            أدخل بياناتك للوصول إلى لوحة العمل.
          </p>
          <div className="rule-double mb-7 mt-5" aria-hidden />

          <LoginForm />

          <p className="mt-8 text-center text-[13px] text-gray-400">
            نسيت كلمة المرور؟ تواصل مع إدارة المكتب لإعادة تعيينها.
          </p>
        </div>
      </section>
    </main>
  );
}
