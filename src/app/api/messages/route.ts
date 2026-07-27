import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { verifySameOrigin } from "@/lib/request";
import {
  createInternalMessage,
  getInternalMessageUpdates,
} from "@/lib/internal-messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({
  recipientId: z.string().min(1, "اختر الموظف"),
  body: z.string().trim().min(1, "اكتب الرسالة").max(4000, "الرسالة طويلة جدًا"),
});

const readSchema = z.object({
  peerId: z.string().min(1),
});

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

function parseSince(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();

  const oldestAllowed = Date.now() - 10 * 60 * 1000;
  return new Date(Math.max(parsed.getTime(), oldestAllowed));
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول" },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const since = parseSince(request.nextUrl.searchParams.get("since"));
  const messages = await getInternalMessageUpdates(user.id, since);
  return NextResponse.json({ messages }, { headers: noStoreHeaders });
}

export async function POST(request: NextRequest) {
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
  const parsed = messageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات الرسالة غير صحيحة" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const message = await createInternalMessage(user, parsed.data);
  if (!message) {
    return NextResponse.json(
      { error: "الموظف غير موجود أو الحساب معطل" },
      { status: 404, headers: noStoreHeaders }
    );
  }

  return NextResponse.json({ message }, { status: 201, headers: noStoreHeaders });
}

export async function PATCH(request: NextRequest) {
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
  const parsed = readSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات المحادثة غير صحيحة" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const result = await prisma.message.updateMany({
    where: {
      senderId: parsed.data.peerId,
      recipientId: user.id,
      read: false,
    },
    data: { read: true },
  });

  return NextResponse.json({ updated: result.count }, { headers: noStoreHeaders });
}

