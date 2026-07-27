"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconBell, IconMessage } from "@/components/icons";

type ActivityItem = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  href: string;
  createdAtLabel: string;
};

type CountsResponse = {
  notifications: number;
  messages: number;
};

export function HeaderActivityPopovers() {
  const [counts, setCounts] = useState<CountsResponse>({
    notifications: 0,
    messages: 0,
  });
  const [notifications, setNotifications] = useState<ActivityItem[] | null>(null);
  const [messages, setMessages] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/header-feed?type=counts", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CountsResponse | null) => {
        if (data) setCounts(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const loadNotifications = useCallback(async () => {
    if (notifications) return;
    const response = await fetch("/api/header-feed?type=notifications", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("تعذر تحميل الإشعارات");
    const data = (await response.json()) as { items: ActivityItem[] };
    setNotifications(data.items);
  }, [notifications]);

  const loadMessages = useCallback(async () => {
    if (messages) return;
    const response = await fetch("/api/header-feed?type=messages", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("تعذر تحميل الرسائل");
    const data = (await response.json()) as { items: ActivityItem[] };
    setMessages(data.items);
  }, [messages]);

  return (
    <>
      <HeaderPopover
        count={counts.messages}
        label="الرسائل"
        seeAllHref="/messages"
        emptyText="لا توجد رسائل جديدة"
        items={messages}
        onOpen={loadMessages}
      >
        <IconMessage />
      </HeaderPopover>
      <HeaderPopover
        count={counts.notifications}
        label="الإشعارات"
        seeAllHref="/notifications"
        emptyText="لا توجد إشعارات جديدة"
        items={notifications}
        onOpen={loadNotifications}
      >
        <IconBell />
      </HeaderPopover>
    </>
  );
}

function HeaderPopover({
  count,
  label,
  seeAllHref,
  emptyText,
  items,
  onOpen,
  children,
}: {
  count: number;
  label: string;
  seeAllHref: string;
  emptyText: string;
  items: ActivityItem[] | null;
  onOpen: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    setOpen(true);
    setError(false);
    void onOpen().catch(() => setError(true));
  }, [onOpen]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onFocus={show}
        className="header-icon-button"
      >
        {children}
        {count > 0 && (
          <span className="absolute -left-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-seal-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="header-dropdown left-0 top-11 w-[min(340px,calc(100vw-2rem))]">
          <div className="flex items-center justify-between border-b border-line bg-paper/70 px-3 py-2.5">
            <span className="text-sm font-bold text-ink">{label}</span>
            {count > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                {count} جديد
              </span>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {error ? (
              <div className="px-4 py-8 text-center text-sm text-seal-700">
                تعذر تحميل البيانات
              </div>
            ) : items === null ? (
              <ActivitySkeleton />
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">{emptyText}</div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`block border-b border-gray-100 px-3 py-3 transition last:border-b-0 hover:bg-brand-50/55 ${
                    item.read ? "" : "bg-brand-50/35"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read ? "bg-gray-200" : "bg-seal-600"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{item.title}</span>
                      {item.body && (
                        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-gray-500">
                          {item.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-gray-400">{item.createdAtLabel}</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href={seeAllHref}
            onClick={() => setOpen(false)}
            className="block border-t border-line bg-white px-3 py-2.5 text-center text-xs font-bold text-brand-700 transition hover:bg-brand-50"
          >
            عرض الكل
          </Link>
        </div>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3 p-3" aria-label="جار التحميل">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="skeleton h-8 w-8 shrink-0" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="skeleton block h-3 w-2/3" />
            <span className="skeleton block h-2.5 w-full" />
          </span>
        </div>
      ))}
    </div>
  );
}
