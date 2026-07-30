import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import {
  summarizeMessageReactions,
  type MessageReactionSummary,
} from "@/lib/message-reactions";

export type InternalMessageEvent = {
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
};

export async function getInternalMessageUpdates(
  userId: string,
  since: Date,
  take = 100
): Promise<InternalMessageEvent[]> {
  const rows = await prisma.message.findMany({
    where: {
      // Inclusive cursor plus client/server de-duplication avoids losing two
      // messages that PostgreSQL stores with the same millisecond timestamp.
      updatedAt: { gte: since },
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      body: true,
      senderId: true,
      recipientId: true,
      createdAt: true,
      updatedAt: true,
      sender: { select: { name: true } },
      reactions: {
        orderBy: { createdAt: "asc" },
        select: {
          emoji: true,
          userId: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((row) => {
    const mine = row.senderId === userId;
    return {
      id: row.id,
      body: row.body,
      senderId: row.senderId,
      recipientId: row.recipientId,
      senderName: row.sender.name,
      mine,
      peerId: mine ? row.recipientId : row.senderId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      reactions: summarizeMessageReactions(row.reactions, userId),
    };
  });
}

export async function createInternalMessage(
  actor: User,
  input: { recipientId: string; body: string }
): Promise<InternalMessageEvent | null> {
  if (input.recipientId === actor.id) return null;

  const recipient = await prisma.user.findFirst({
    where: { id: input.recipientId, isActive: true },
    select: { id: true },
  });
  if (!recipient) return null;

  const message = await prisma.message.create({
    data: {
      senderId: actor.id,
      recipientId: recipient.id,
      body: input.body,
    },
    select: {
      id: true,
      body: true,
      senderId: true,
      recipientId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await notify({
    userId: recipient.id,
    type: "message",
    title: "رسالة جديدة",
    body: `${actor.name} أرسل لك رسالة`,
    link: `/messages?to=${actor.id}`,
  });

  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    recipientId: message.recipientId,
    senderName: actor.name,
    mine: true,
    peerId: recipient.id,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    reactions: [],
  };
}
