"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { IconSearch } from "@/components/icons";
import type { DashboardSearchResponse } from "@/lib/search-types";

const EMPTY_RESPONSE: DashboardSearchResponse = {
  query: "",
  total: 0,
  groups: [],
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<DashboardSearchResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = useCallback(() => {
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        closeDialog();
        return;
      }
      const commandSearch = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const slashSearch = event.key === "/" && !isTypingTarget(event.target);
      if (commandSearch || slashSearch) {
        event.preventDefault();
        openDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, open, openDialog]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResponse(EMPTY_RESPONSE);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("تعذّر تنفيذ البحث");
        const data = (await res.json()) as DashboardSearchResponse;
        setResponse(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "تعذّر تنفيذ البحث");
        setResponse(EMPTY_RESPONSE);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="البحث العام"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/95 text-gray-500 shadow-sm shadow-black/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-brand-700"
      >
        <IconSearch />
      </button>

      {open && (
        <div
          className="search-bubble-overlay fixed inset-0 z-[90] bg-brand-950/35 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-search-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div className="search-bubble-panel mx-auto mt-8 flex max-h-[min(760px,calc(100vh-4rem))] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl shadow-brand-950/20 sm:mt-12">
            <div className="search-bubble-content border-b border-line bg-[radial-gradient(circle_at_12%_18%,rgba(205,175,99,0.20),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f6f3ea_100%)] p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-lg shadow-brand-900/15">
                  <IconSearch className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="global-search-title" className="font-display text-lg font-bold text-ink">
                    البحث العام
                  </h2>
                  <div className="mt-2">
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="field h-12 pr-4 text-[15px]"
                      placeholder="ابحث عن موكل، قضية، مستند، جلسة، فاتورة..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-lg leading-none text-gray-500 transition hover:border-seal-200 hover:text-seal-700"
                  aria-label="إغلاق البحث"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="search-bubble-content min-h-0 flex-1 overflow-y-auto bg-paper/65 p-3 sm:p-4">
              {error ? (
                <div className="rounded-xl border border-seal-100 bg-seal-50 px-4 py-3 text-sm text-seal-700">
                  {error}
                </div>
              ) : !query.trim() ? (
                <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-line bg-white/75 px-5 text-center">
                  <div>
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <IconSearch className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">كل ملفات المكتب في نافذة واحدة</p>
                  </div>
                </div>
              ) : loading && response.total === 0 ? (
                <SearchSkeleton />
              ) : response.total === 0 ? (
                <div className="rounded-xl border border-line bg-white px-4 py-10 text-center text-sm text-gray-500">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-gray-500">
                    <span className="font-semibold text-ink">{response.total}</span> نتيجة
                    {loading && <span className="mr-2 text-brand-700">جار التحديث...</span>}
                  </div>
                  {response.groups.map((group) => (
                    <section key={group.title} className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="border-b border-line bg-paper/70 px-4 py-2.5 text-xs font-bold text-gray-500">
                        {group.title}
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.results.map((result) => (
                          <Link
                            key={result.id}
                            href={result.href}
                            onClick={closeDialog}
                            className="block px-4 py-3 transition hover:bg-brand-50/45"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                                <IconSearch className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="truncate text-sm font-semibold text-ink">
                                    {result.title}
                                  </p>
                                  {result.badge && (
                                    <Badge className={`shrink-0 ${result.badgeClass ?? "bg-gray-100 text-gray-700"}`}>
                                      {result.badge}
                                    </Badge>
                                  )}
                                </div>
                                {result.subtitle && (
                                  <p className="mt-1 truncate text-xs text-gray-500">{result.subtitle}</p>
                                )}
                                {result.meta && (
                                  <p className="mt-1 line-clamp-1 text-xs text-gray-400">{result.meta}</p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-line bg-white p-4">
          <div className="h-3 w-36 animate-pulse rounded-full bg-gray-100" />
          <div className="mt-3 space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
