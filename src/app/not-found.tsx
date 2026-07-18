import Link from "next/link";
import { IconSearch } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
          <IconSearch className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">
          الصفحة غير موجودة
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          لم نتمكن من العثور على ما تبحث عنه.
        </p>
        <div className="rule-double mx-auto my-6 w-24" aria-hidden />
        <Link href="/dashboard" className="btn-primary">
          العودة إلى الرئيسية
        </Link>
      </div>
    </main>
  );
}
