import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/rbac";
import {
  MessagesClient,
  type MessageContact,
  type MessageItem,
} from "./messages-client";

export const metadata = { title: "الرسائل - نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const me = await requireUser();
  const { to } = await searchParams;

  const contacts = await prisma.user.findMany({
    where: { isActive: true, id: { not: me.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  const unreadGroups = await prisma.message.groupBy({
    by: ["senderId"],
    where: { recipientId: me.id, read: false },
    _count: { _all: true },
  });
  const unreadBySender = new Map(
    unreadGroups.map((group) => [group.senderId, group._count._all])
  );

  const selectedUser = to
    ? contacts.find((contact) => contact.id === to) ?? null
    : null;
  const selectedUnread = selectedUser
    ? unreadBySender.get(selectedUser.id) ?? 0
    : 0;

  let initialMessages: MessageItem[] = [];
  if (selectedUser) {
    const [, messages] = await Promise.all([
      prisma.message.updateMany({
        where: {
          senderId: selectedUser.id,
          recipientId: me.id,
          read: false,
        },
        data: { read: true },
      }),
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: me.id, recipientId: selectedUser.id },
            { senderId: selectedUser.id, recipientId: me.id },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 200,
        select: { id: true, body: true, senderId: true, createdAt: true },
      }),
    ]);

    initialMessages = messages.map((message) => ({
      id: message.id,
      body: message.body,
      mine: message.senderId === me.id,
      createdAt: message.createdAt.toISOString(),
    }));
    unreadBySender.set(selectedUser.id, 0);
  }

  const contactItems: MessageContact[] = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    roleLabel: ROLE_LABELS[contact.role],
    unread: unreadBySender.get(contact.id) ?? 0,
  }));
  const selected = selectedUser
    ? contactItems.find((contact) => contact.id === selectedUser.id) ?? null
    : null;

  return (
    <div>
      <PageHeader
        title="الرسائل"
        subtitle="تواصل لحظي وآمن بين موظفي المكتب"
      />
      <MessagesClient
        contacts={contactItems}
        selected={selected}
        initialMessages={initialMessages}
        selectedUnread={selectedUnread}
      />
    </div>
  );
}
