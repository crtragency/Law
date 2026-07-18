import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = {
  title: "الإعداد الأول — نظام مكتب المحاماة",
};

// نمنع أي تخزين مؤقت لهذه الصفحة الحساسة.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // إذا كان هناك مستخدم بالفعل، فالنظام مُعدّ — وجّه لتسجيل الدخول.
  let dbReady = true;
  let hasUsers = false;
  try {
    hasUsers = (await prisma.user.count()) > 0;
  } catch {
    dbReady = false;
  }

  if (dbReady && hasUsers) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            ⚖️
          </div>
          <h1 className="text-2xl font-bold">إعداد النظام لأول مرة</h1>
          <p className="mt-1 text-sm text-brand-100">
            أنشئ حساب المدير — دي أول خطوة وتتعمل مرة واحدة بس
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          {!dbReady ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-amber-800">
                قاعدة البيانات مش جاهزة لسه.
              </div>
              <p className="text-gray-600">
                عشان تكمل الإعداد، تأكد إنك عملت الآتي على Vercel:
              </p>
              <ol className="list-inside list-decimal space-y-1 text-gray-600">
                <li>
                  أضفت متغير <code className="rounded bg-gray-100 px-1">DATABASE_URL</code>{" "}
                  في إعدادات المشروع.
                </li>
                <li>أعدت النشر (Redeploy) بعد إضافة المتغير.</li>
              </ol>
              <p className="text-gray-600">
                بعد كده حدّث الصفحة دي وكمّل.
              </p>
            </div>
          ) : (
            <SetupForm />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-brand-200">
          عندك حساب بالفعل؟{" "}
          <Link href="/login" className="underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
}
