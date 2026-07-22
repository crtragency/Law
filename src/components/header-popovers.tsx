"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell, IconMessage } from "@/components/icons";

export type HeaderNotificationItem = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  href: string;
  createdAtLabel: string;
};

export type HeaderMessageItem = {
  id: string;
  senderName: string;
  body: string;
  read: boolean;
  href: string;
  createdAtLabel: string;
};

type HeaderPopoverProps = {
  count: number;
  label: string;
  seeAllHref: string;
  emptyText: string;
  children: React.ReactNode;
  items: {
    id: string;
    title: string;
    body?: string | null;
    href: string;
    read: boolean;
    createdAtLabel: string;
  }[];
};

export function HeaderNotificationsPopover({
  count,
  items,
}: {
  count: number;
  items: HeaderNotificationItem[];
}) {
  return (
    <HeaderPopover
      count={count}
      label="الإشعارات"
      seeAllHref="/notifications"
      emptyText="لا توجد إشعارات جديدة"
      items={items}
    >
      <IconBell />
    </HeaderPopover>
  );
}

export function HeaderMessagesPopover({
  count,
  items,
}: {
  count: number;
  items: HeaderMessageItem[];
}) {
  return (
    <HeaderPopover
      count={count}
      label="الرسائل"
      seeAllHref="/messages"
      emptyText="لا توجد رسائل جديدة"
      items={items.map((item) => ({
        id: item.id,
        title: item.senderName,
        body: item.body,
        href: item.href,
        read: item.read,
        createdAtLabel: item.createdAtLabel,
      }))}
    >
      <IconMessage />
    </HeaderPopover>
  );
}

function HeaderPopover({
  count,
  label,
  seeAllHref,
  emptyText,
  items,
  children,
}: HeaderPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white/95 text-gray-500 shadow-sm shadow-black/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-brand-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        {children}
        {count > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-seal-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-11 z-50 w-[min(340px,calc(100vw-2rem))] origin-top-left overflow-hidden rounded-lg border border-line bg-white shadow-[0_24px_70px_rgba(12,32,26,0.18)] ring-1 ring-black/[0.02]"
        >
          <div className="flex items-center justify-between border-b border-line bg-paper/70 px-3 py-2.5">
            <span className="text-sm font-bold text-ink">{label}</span>
            {count > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                {count} جديد
              </span>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {items.length === 0 ? (
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
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        item.read ? "bg-gray-200" : "bg-seal-600"
                      }`}
                    />
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
