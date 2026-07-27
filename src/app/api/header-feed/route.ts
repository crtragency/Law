import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type");
  const headers = { "Cache-Control": "private, no-store" };

  if (type === "counts") {
    const [notifications, messages] = await Promise.all([
      prisma.notification.count({ where: { userId: user.id, read: false } }),
      prisma.message.count({ where: { recipientId: user.id, read: false } }),
    ]);
    return NextResponse.json({ notifications, messages }, { headers });
  }

  if (type === "notifications") {
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
      },
    });
    return NextResponse.json(
      {
        items: rows.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          read: item.read,
          href: item.link ?? "/notifications",
          createdAtLabel: formatDateTime(item.createdAt),
        })),
      },
      { headers }
    );
  }

  if (type === "messages") {
    const rows = await prisma.message.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        body: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(
      {
        items: rows.map((item) => ({
          id: item.id,
          title: item.sender.name,
          body: item.body,
          read: item.read,
          href: `/messages?to=${item.sender.id}`,
          createdAtLabel: formatDateTime(item.createdAt),
        })),
      },
      { headers }
    );
  }

  return NextResponse.json({ error: "نوع غير صالح" }, { status: 400, headers });
}
