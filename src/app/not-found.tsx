import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl">🔍</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-800">
          الصفحة غير موجودة
        </h1>
        <p className="mt-2 text-gray-500">
          عذراً، لم نتمكن من العثور على ما تبحث عنه.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
