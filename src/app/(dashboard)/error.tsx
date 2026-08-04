"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const [retrying, setRetrying] = useState(true);

  useEffect(() => {
    console.error(error);
    const key = `dashboard-retry:${pathname}`;
    const now = Date.now();
    let retryState = { count: 0, at: now };

    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as { count?: number; at?: number };
        if (typeof parsed.at === "number" && now - parsed.at < 60_000) {
          retryState = {
            count: typeof parsed.count === "number" ? parsed.count : 0,
            at: parsed.at,
          };
        }
      }
    } catch {
      // sessionStorage can be unavailable in strict privacy modes.
    }

    if (retryState.count >= 2) {
      setRetrying(false);
      return;
    }

    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({ count: retryState.count + 1, at: now })
      );
    } catch {
      // The manual retry remains available if persistence is blocked.
    }

    const timer = window.setTimeout(() => reset(), 900 + retryState.count * 700);
    return () => window.clearTimeout(timer);
  }, [error, pathname, reset]);

  return (
    <div className="mx-auto grid min-h-[55vh] max-w-xl place-items-center text-center">
      <div className="card w-full">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-seal-50 text-xl font-bold text-seal-700">
          !
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          {retrying ? "جاري إعادة الاتصال" : "تعذر تحميل الصفحة"}
        </h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          {retrying
            ? "الاتصال بالبيانات تأخر قليلًا. نحاول مرة أخرى تلقائيًا..."
            : "حدث خطأ مؤقت أثناء تجهيز البيانات. لم يتم فقد أي تغييرات."}
        </p>
        {!retrying && (
          <button type="button" onClick={reset} className="btn-primary mt-5">
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
}
