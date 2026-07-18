import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/rbac";
import { MessageForm } from "./message-form";

export const metadata = { title: "الرسائل — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const me = await requireUser();
  const { to } = await searchParams;

  // جهات الاتصال: كل الموظفين الفعّالين عداي.
  const contacts = await prisma.user.findMany({
    where: { isActive: true, id: { not: me.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  // عدد الرسائل غير المقروءة لكل مُرسِل.
  const unreadGroups = await prisma.message.groupBy({
    by: ["senderId"],
    where: { recipientId: me.id, read: false },
    _count: { _all: true },
  });
  const unreadBySender = new Map(
    unreadGroups.map((g) => [g.senderId, g._count._all])
  );

  const selected = to ? contacts.find((c) => c.id === to) ?? null : null;

  let thread: {
    id: string;
    body: string;
    mine: boolean;
    createdAt: Date;
  }[] = [];

  if (selected) {
    // علّم الرسائل الواردة من هذا الموظف كمقروءة.
    await prisma.message.updateMany({
      where: { senderId: selected.id, recipientId: me.id, read: false },
      data: { read: true },
    });

    const msgs = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: selected.id },
          { senderId: selected.id, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, body: true, senderId: true, createdAt: true },
    });
    thread = msgs.map((m) => ({
      id: m.id,
      body: m.body,
      mine: m.senderId === me.id,
      createdAt: m.createdAt,
    }));
  }

  return (
    <div>
      <PageHeader
        title="الرسائل"
        subtitle="تواصل مباشر بين موظفي المكتب"
      />

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* قائمة جهات الاتصال */}
        <div className="card max-h-[70vh] overflow-y-auto p-0">
          {contacts.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">لا يوجد موظفون آخرون</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {contacts.map((c) => {
                const unread = unreadBySender.get(c.id) ?? 0;
                const active = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/messages?to=${c.id}`}
                      className={`flex items-center gap-3 p-3 transition ${
                        active ? "bg-brand-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {c.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800">
                          {c.name}
                        </span>
                        <span className="block text-xs text-gray-400">
                          {ROLE_LABELS[c.role]}
                        </span>
                      </span>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                          {unread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* نافذة المحادثة */}
        <div className="card flex h-[70vh] flex-col p-0">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              اختر موظفاً من القائمة لبدء المحادثة
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {selected.name.charAt(0)}
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-gray-800">
                    {selected.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {ROLE_LABELS[selected.role]}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
                {/* عكس الترتيب بصرياً ليظهر الأحدث بالأسفل مع التمرير */}
                {[...thread].reverse().map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.mine ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.mine
                          ? "bg-brand-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          m.mine ? "text-brand-100" : "text-gray-400"
                        }`}
                      >
                        {formatDateTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {thread.length === 0 && (
                  <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                    ابدأ المحادثة بإرسال رسالة
                  </div>
                )}
              </div>

              <MessageForm recipientId={selected.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
