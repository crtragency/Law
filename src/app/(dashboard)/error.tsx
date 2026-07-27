"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[55vh] max-w-xl place-items-center text-center">
      <div className="card w-full">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-seal-50 text-xl font-bold text-seal-700">
          !
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          تعذر تحميل الصفحة
        </h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          حدث خطأ مؤقت أثناء تجهيز البيانات. لم يتم فقد أي تغييرات.
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-5">
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
