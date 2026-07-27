"use client";

import Link from "next/link";
import {
  Clock3,
  LoaderCircle,
  RotateCcw,
  Smile,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconSend } from "@/components/icons";

export type MessageContact = {
  id: string;
  name: string;
  roleLabel: string;
  unread: number;
};

export type MessageItem = {
  id: string;
  body: string;
  mine: boolean;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
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
};

type StreamStatus = "connecting" | "live" | "reconnecting";

const EMOJIS = [
  { char: "😀", label: "سعيد" },
  { char: "😄", label: "مبتسم" },
  { char: "😂", label: "ضحك" },
  { char: "😊", label: "ابتسامة" },
  { char: "😍", label: "إعجاب" },
  { char: "🤩", label: "رائع" },
  { char: "😎", label: "ممتاز" },
  { char: "🤔", label: "تفكير" },
  { char: "😅", label: "ارتياح" },
  { char: "😢", label: "حزن" },
  { char: "😡", label: "غضب" },
  { char: "🙏", label: "شكر" },
  { char: "👍", label: "موافق" },
  { char: "👎", label: "غير موافق" },
  { char: "👏", label: "تصفيق" },
  { char: "👌", label: "تمام" },
  { char: "🤝", label: "اتفاق" },
  { char: "💪", label: "قوة" },
  { char: "❤️", label: "قلب" },
  { char: "💚", label: "قلب أخضر" },
  { char: "🔥", label: "رائع جدًا" },
  { char: "✨", label: "مميز" },
  { char: "🎉", label: "احتفال" },
  { char: "💯", label: "مائة بالمائة" },
  { char: "✅", label: "تم" },
  { char: "❌", label: "مرفوض" },
  { char: "⚠️", label: "تنبيه" },
  { char: "⏳", label: "انتظار" },
  { char: "📌", label: "مهم" },
  { char: "📎", label: "مرفق" },
  { char: "📝", label: "ملاحظة" },
  { char: "📅", label: "موعد" },
  { char: "⚖️", label: "قانون" },
  { char: "🏛️", label: "محكمة" },
  { char: "💼", label: "عمل" },
  { char: "🔍", label: "بحث" },
] as const;

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatMessageTime(value: string) {
  return dateFormatter.format(new Date(value));
}

function mergeMessages(current: MessageItem[], additions: MessageItem[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  additions.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function MessagesClient({
  contacts,
  selected,
  initialMessages,
  selectedUnread,
}: {
  contacts: MessageContact[];
  selected: MessageContact | null;
  initialMessages: MessageItem[];
  selectedUnread: number;
}) {
  const [thread, setThread] = useState(initialMessages);
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(contacts.map((contact) => [contact.id, contact.unread]))
  );
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [streamStatus, setStreamStatus] =
    useState<StreamStatus>("connecting");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThread(initialMessages);
    setDraft("");
    setEmojiOpen(false);
    setUnread((current) => ({
      ...current,
      ...(selected ? { [selected.id]: 0 } : {}),
    }));
  }, [initialMessages, selected]);

  useEffect(() => {
    if (selectedUnread <= 0) return;
    window.dispatchEvent(new Event("law:messages-read"));
  }, [selectedUnread]);

  const markConversationRead = useCallback(async (peerId: string) => {
    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ peerId }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("law:messages-read"));
      }
    } catch {
      // A later incoming message or page navigation will retry the read update.
    }
  }, []);

  useEffect(() => {
    let readTimer: number | null = null;

    const receiveMessage = (event: Event) => {
      const message = (event as CustomEvent<RealtimeMessage>).detail;
      if (!message) return;

      if (message.peerId === selected?.id) {
        setThread((current) => {
          const liveMessage: MessageItem = {
            id: message.id,
            body: message.body,
            mine: message.mine,
            createdAt: message.createdAt,
          };
          const matchingOptimistic = message.mine
            ? current.find(
                (item) =>
                  item.mine && item.pending && item.body === message.body
              )
            : undefined;
          return mergeMessages(
            matchingOptimistic
              ? current.filter((item) => item.id !== matchingOptimistic.id)
              : current,
            [liveMessage]
          );
        });
        setUnread((current) => ({ ...current, [message.peerId]: 0 }));

        if (!message.mine) {
          if (readTimer !== null) window.clearTimeout(readTimer);
          readTimer = window.setTimeout(() => {
            void markConversationRead(message.peerId);
          }, 120);
        }
      } else if (!message.mine) {
        setUnread((current) => ({
          ...current,
          [message.peerId]: (current[message.peerId] ?? 0) + 1,
        }));
      }
    };

    const receiveStatus = (event: Event) => {
      setStreamStatus(
        (event as CustomEvent<StreamStatus>).detail ?? "reconnecting"
      );
    };

    const streamTarget = window as Window & {
      __lawMessageStreamStatus?: StreamStatus;
    };
    setStreamStatus(streamTarget.__lawMessageStreamStatus ?? "connecting");

    window.addEventListener("law:message-received", receiveMessage);
    window.addEventListener("law:message-stream-status", receiveStatus);
    return () => {
      if (readTimer !== null) window.clearTimeout(readTimer);
      window.removeEventListener("law:message-received", receiveMessage);
      window.removeEventListener("law:message-stream-status", receiveStatus);
    };
  }, [markConversationRead, selected?.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread]);

  useEffect(() => {
    if (!emojiOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setEmojiOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [emojiOpen]);

  const contactCount = useMemo(
    () => contacts.reduce((sum, contact) => sum + (unread[contact.id] ?? 0), 0),
    [contacts, unread]
  );

  async function sendBody(body: string, existingTempId?: string) {
    if (!selected) return;

    const cleanBody = body.trim();
    if (!cleanBody) return;

    const tempId = existingTempId ?? `temp-${crypto.randomUUID()}`;
    const optimistic: MessageItem = {
      id: tempId,
      body: cleanBody,
      mine: true,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setThread((current) => {
      const withoutPrevious = current.filter((message) => message.id !== tempId);
      return mergeMessages(withoutPrevious, [optimistic]);
    });

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId: selected.id,
          body: cleanBody,
        }),
      });
      const data = (await response.json()) as {
        message?: RealtimeMessage;
        error?: string;
      };
      if (!response.ok || !data.message) {
        throw new Error(data.error ?? "تعذر إرسال الرسالة");
      }

      setThread((current) =>
        mergeMessages(
          current.filter((message) => message.id !== tempId),
          [
            {
              id: data.message!.id,
              body: data.message!.body,
              mine: true,
              createdAt: data.message!.createdAt,
            },
          ]
        )
      );
    } catch {
      setThread((current) =>
        current.map((message) =>
          message.id === tempId
            ? { ...message, pending: false, failed: true }
            : message
        )
      );
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft;
    if (!body.trim()) return;
    setDraft("");
    setEmojiOpen(false);
    void sendBody(body);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(next);
    requestAnimationFrame(() => {
      textarea?.focus();
      const cursor = start + emoji.length;
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="card max-h-[176px] overflow-hidden p-0 md:max-h-[72vh]">
        <div className="flex min-h-14 items-center justify-between border-b border-line px-4">
          <div>
            <h2 className="text-sm font-bold text-ink">فريق المكتب</h2>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {contacts.length} موظف
            </p>
          </div>
          {contactCount > 0 && (
            <span className="badge bg-brand-50 text-brand-800">
              {contactCount} جديد
            </span>
          )}
        </div>

        <div className="max-h-[120px] overflow-x-auto overflow-y-hidden md:max-h-[calc(72vh-3.5rem)] md:overflow-x-hidden md:overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              لا يوجد موظفون آخرون
            </p>
          ) : (
            <ul className="flex min-w-max divide-x divide-x-reverse divide-gray-100 md:block md:min-w-0 md:divide-x-0 md:divide-y">
              {contacts.map((contact) => {
                const count = unread[contact.id] ?? 0;
                const active = selected?.id === contact.id;
                return (
                  <li key={contact.id} className="w-[170px] md:w-auto">
                    <Link
                      href={`/messages?to=${contact.id}`}
                      className={`flex min-h-[68px] items-center gap-3 border-b-2 px-3.5 py-3 transition md:border-b-0 md:border-r-2 ${
                        active
                          ? "border-brand-700 bg-brand-50/80"
                          : "border-transparent hover:bg-brand-50/40"
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">
                        {contact.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">
                          {contact.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-400">
                          {contact.roleLabel}
                        </span>
                      </span>
                      {count > 0 && !active && (
                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="card flex h-[calc(100dvh-19rem)] min-h-[380px] flex-col overflow-hidden p-0 md:h-[72vh] md:min-h-[520px]">
        {!selected ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <IconSend className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold text-ink">
                اختر محادثة
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                اختر موظفًا من القائمة لبدء التواصل
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">
                  {selected.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-ink">
                    {selected.name}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {selected.roleLabel}
                  </p>
                </div>
              </div>

              <div
                className={`flex shrink-0 items-center gap-1.5 text-[11px] font-semibold ${
                  streamStatus === "live"
                    ? "text-brand-700"
                    : "text-brass-700"
                }`}
                title={
                  streamStatus === "live"
                    ? "الرسائل متصلة لحظيًا"
                    : "جار إعادة الاتصال"
                }
              >
                {streamStatus === "live" ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {streamStatus === "live" ? "مباشر" : "إعادة اتصال"}
                </span>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-paper/45 p-4 sm:p-5">
              {thread.length === 0 ? (
                <div className="grid flex-1 place-items-center text-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">
                      ابدأ المحادثة برسالة جديدة
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      ستظهر الرسائل الجديدة هنا فور وصولها
                    </p>
                  </div>
                </div>
              ) : (
                thread.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.mine ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] rounded-lg px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[72%] ${
                        message.mine
                          ? "bg-brand-800 text-white"
                          : "border border-line/70 bg-white text-ink"
                      } ${message.failed ? "ring-1 ring-seal-500" : ""}`}
                    >
                      <p dir="auto" className="whitespace-pre-wrap break-words leading-6">
                        {message.body}
                      </p>
                      <div
                        className={`mt-1.5 flex items-center gap-1 text-[10px] ${
                          message.mine ? "text-brand-100" : "text-gray-400"
                        }`}
                      >
                        {message.pending ? (
                          <>
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            <span>جار الإرسال</span>
                          </>
                        ) : message.failed ? (
                          <>
                            <Clock3 className="h-3 w-3" />
                            <span>لم تُرسل</span>
                            <button
                              type="button"
                              onClick={() =>
                                void sendBody(message.body, message.id)
                              }
                              className="mr-1 inline-flex items-center gap-1 font-bold text-white underline underline-offset-2"
                            >
                              <RotateCcw className="h-3 w-3" />
                              إعادة
                            </button>
                          </>
                        ) : (
                          formatMessageTime(message.createdAt)
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messageEndRef} />
            </div>

            <div ref={composerRef} className="relative border-t border-line bg-white">
              {emojiOpen && (
                <div
                  role="dialog"
                  aria-label="اختيار إيموجي"
                  className="absolute bottom-[calc(100%+8px)] right-3 z-20 w-[min(340px,calc(100vw-4rem))] rounded-lg border border-line bg-white p-3 shadow-xl shadow-brand-950/10"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">
                      اختار إيموجي
                    </span>
                    <span className="text-[10px] text-gray-400">
                      يضاف داخل الرسالة
                    </span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji.char}
                        type="button"
                        onClick={() => insertEmoji(emoji.char)}
                        title={emoji.label}
                        aria-label={emoji.label}
                        className="grid aspect-square w-full place-items-center rounded-md text-xl transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {emoji.char}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form
                ref={formRef}
                onSubmit={submitMessage}
                className="flex flex-wrap items-end gap-2 p-3 sm:p-4"
              >
                <button
                  type="button"
                  onClick={() => setEmojiOpen((open) => !open)}
                  aria-label="إضافة إيموجي"
                  aria-expanded={emojiOpen}
                  title="إضافة إيموجي"
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition ${
                    emojiOpen
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-line bg-white text-gray-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  <Smile className="h-5 w-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  maxLength={4000}
                  autoComplete="off"
                  placeholder="اكتب رسالة..."
                  aria-label="نص الرسالة"
                  className="order-first min-h-11 max-h-32 basis-full resize-none rounded-lg border border-line bg-white px-3.5 py-2.5 text-base leading-6 text-ink outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 sm:order-none sm:flex-1 sm:basis-auto sm:text-sm"
                />

                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="إرسال الرسالة"
                  title="إرسال"
                  className="btn-primary h-11 flex-1 px-3.5 sm:flex-none sm:shrink-0 sm:px-4"
                >
                  <IconSend className="h-4 w-4" />
                  <span className="hidden sm:inline">إرسال</span>
                </button>
              </form>
              <p className="px-4 pb-2.5 text-[10px] text-gray-400">
                Enter للإرسال، وShift + Enter لسطر جديد
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
