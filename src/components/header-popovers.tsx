"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconBell, IconMessage } from "@/components/icons";
import type { MessageReactionSummary } from "@/lib/message-reactions";

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

type RealtimeMessage = {
  id: string;
  body: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  mine: boolean;
  peerId: string;
  createdAt: string;
  updatedAt: string;
  reactions: MessageReactionSummary[];
  changeType?: "message" | "update";
};

type StreamStatus = "connecting" | "live" | "reconnecting";

function dispatchStreamStatus(status: StreamStatus) {
  const target = window as Window & {
    __lawMessageStreamStatus?: StreamStatus;
  };
  target.__lawMessageStreamStatus = status;
  window.dispatchEvent(
    new CustomEvent("law:message-stream-status", { detail: status })
  );
}

function messageTimeLabel(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function HeaderActivityPopovers() {
  const [counts, setCounts] = useState<CountsResponse>({
    notifications: 0,
    messages: 0,
  });
  const [activePopover, setActivePopover] = useState<
    "messages" | "notifications" | null
  >(null);
  const [notifications, setNotifications] = useState<ActivityItem[] | null>(null);
  const [messages, setMessages] = useState<ActivityItem[] | null>(null);
  const countRefreshTimer = useRef<number | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/header-feed?type=counts", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as CountsResponse;
      setCounts(data);
    } catch {
      // The live stream or the next navigation will retry the counters.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialSince = new Date(Date.now() - 1_000).toISOString();
    const cursor = { current: initialSince };
    const seenVersions = new Map<string, string>();
    let fallbackTimer: number | null = null;
    let eventSource: EventSource | null = null;

    const scheduleCountRefresh = () => {
      if (countRefreshTimer.current) {
        window.clearTimeout(countRefreshTimer.current);
      }
      countRefreshTimer.current = window.setTimeout(() => {
        void loadCounts();
      }, 450);
    };

    const receive = (incoming: RealtimeMessage[]) => {
      const fresh = incoming.flatMap((message) => {
        const previousVersion = seenVersions.get(message.id);
        if (previousVersion === message.updatedAt) return [];
        seenVersions.set(message.id, message.updatedAt);
        const isNewMessage =
          previousVersion === undefined &&
          new Date(message.createdAt).getTime() >=
            new Date(initialSince).getTime();
        return [
          {
            ...message,
            changeType: isNewMessage ? "message" : "update",
          } satisfies RealtimeMessage,
        ];
      });
      if (fresh.length === 0) return;

      cursor.current = fresh[fresh.length - 1]!.updatedAt;
      fresh.forEach((message) => {
        window.dispatchEvent(
          new CustomEvent("law:message-received", { detail: message })
        );
      });

      const received = fresh.filter(
        (message) => message.changeType === "message" && !message.mine
      );
      if (received.length === 0) return;

      setMessages((current) => {
        if (!current) return current;
        const additions = received
          .slice()
          .reverse()
          .map<ActivityItem>((message) => ({
            id: message.id,
            title: message.senderName,
            body: message.body,
            read: false,
            href: `/messages?to=${message.senderId}`,
            createdAtLabel: messageTimeLabel(message.createdAt),
          }));
        const receivedIds = new Set(additions.map((item) => item.id));
        return [
          ...additions,
          ...current.filter((item) => !receivedIds.has(item.id)),
        ].slice(0, 8);
      });
      setNotifications((current) => {
        if (!current) return current;
        const additions = received
          .slice()
          .reverse()
          .map<ActivityItem>((message) => ({
            id: `message-notification-${message.id}`,
            title: "رسالة جديدة",
            body: `${message.senderName} أرسل لك رسالة`,
            read: false,
            href: `/messages?to=${message.senderId}`,
            createdAtLabel: messageTimeLabel(message.createdAt),
          }));
        return [...additions, ...current].slice(0, 8);
      });
      scheduleCountRefresh();
    };

    const pollForUpdates = async () => {
      try {
        const response = await fetch(
          `/api/messages?since=${encodeURIComponent(cursor.current)}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          messages: RealtimeMessage[];
        };
        receive(data.messages);
      } catch {
        // The next fallback tick or the EventSource reconnect will retry.
      }
    };

    const startFallback = () => {
      if (fallbackTimer !== null) return;
      void pollForUpdates();
      fallbackTimer = window.setInterval(pollForUpdates, 3_000);
    };

    void loadCounts();
    dispatchStreamStatus("connecting");

    eventSource = new EventSource(
      `/api/messages/stream?since=${encodeURIComponent(initialSince)}`
    );
    eventSource.onopen = () => {
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
      dispatchStreamStatus("live");
    };
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { messages: RealtimeMessage[] };
        receive(data.messages);
      } catch {
        // Ignore malformed events and keep the live connection running.
      }
    };
    eventSource.onerror = () => {
      dispatchStreamStatus("reconnecting");
      startFallback();
    };

    const refreshAfterRead = () => {
      setMessages(null);
      void loadCounts();
    };
    window.addEventListener("law:messages-read", refreshAfterRead);

    return () => {
      controller.abort();
      eventSource?.close();
      if (fallbackTimer !== null) window.clearInterval(fallbackTimer);
      if (countRefreshTimer.current) {
        window.clearTimeout(countRefreshTimer.current);
      }
      window.removeEventListener("law:messages-read", refreshAfterRead);
    };
  }, [loadCounts]);

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
        open={activePopover === "messages"}
        count={counts.messages}
        label="الرسائل"
        seeAllHref="/messages"
        emptyText="لا توجد رسائل جديدة"
        items={messages}
        onOpen={loadMessages}
        onRequestOpen={() => setActivePopover("messages")}
        onRequestClose={() =>
          setActivePopover((current) => (current === "messages" ? null : current))
        }
      >
        <IconMessage />
      </HeaderPopover>
      <HeaderPopover
        open={activePopover === "notifications"}
        count={counts.notifications}
        label="الإشعارات"
        seeAllHref="/notifications"
        emptyText="لا توجد إشعارات جديدة"
        items={notifications}
        onOpen={loadNotifications}
        onRequestOpen={() => setActivePopover("notifications")}
        onRequestClose={() =>
          setActivePopover((current) =>
            current === "notifications" ? null : current
          )
        }
      >
        <IconBell />
      </HeaderPopover>
    </>
  );
}

function HeaderPopover({
  open,
  count,
  label,
  seeAllHref,
  emptyText,
  items,
  onOpen,
  onRequestOpen,
  onRequestClose,
  children,
}: {
  open: boolean;
  count: number;
  label: string;
  seeAllHref: string;
  emptyText: string;
  items: ActivityItem[] | null;
  onOpen: () => Promise<void>;
  onRequestOpen: () => void;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  const [error, setError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const closeNow = useCallback(() => {
    onRequestClose();
  }, [onRequestClose]);

  const show = useCallback(() => {
    onRequestOpen();
    setError(false);
    void onOpen().catch(() => setError(true));
  }, [onOpen, onRequestOpen]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) closeNow();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeNow();
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeNow, open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={closeNow}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? closeNow() : show())}
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
                  onClick={closeNow}
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
            onClick={closeNow}
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
