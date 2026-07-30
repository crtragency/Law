import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/request";
import {
  isMessageReactionEmoji,
  summarizeMessageReactions,
} from "@/lib/message-reactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reactionSchema = z.object({
  emoji: z.string().refine(isMessageReactionEmoji, "ريأكت غير مدعوم"),
});

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySameOrigin())) {
    return NextResponse.json(
      { error: "طلب غير صالح" },
      { status: 403, headers: noStoreHeaders }
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول" },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ريأكت غير صحيح" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const { id: messageId } = await params;
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [{ senderId: user.id }, { recipientId: user.id }],
    },
    select: { id: true },
  });
  if (!message) {
    return NextResponse.json(
      { error: "الرسالة غير موجودة أو غير متاحة لك" },
      { status: 404, headers: noStoreHeaders }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId: user.id } },
      select: { id: true, emoji: true },
    });

    if (existing?.emoji === parsed.data.emoji) {
      await tx.messageReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await tx.messageReaction.update({
        where: { id: existing.id },
        data: { emoji: parsed.data.emoji },
      });
    } else {
      await tx.messageReaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji: parsed.data.emoji,
        },
      });
    }

    const updatedMessage = await tx.message.update({
      where: { id: messageId },
      data: { updatedAt: new Date() },
      select: {
        updatedAt: true,
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

    return {
      updatedAt: updatedMessage.updatedAt.toISOString(),
      reactions: summarizeMessageReactions(
        updatedMessage.reactions,
        user.id
      ),
    };
  });

  return NextResponse.json(result, { headers: noStoreHeaders });
}
