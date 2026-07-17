import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "التقويم — نظام مكتب المحاماة" };

function map(ev: {
  id: string;
  title: string;
  type: string;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  notes: string | null;
  caseId: string | null;
  case: { title: string } | null;
}) {
  return {
    id: ev.id,
    title: ev.title,
    type: ev.type,
    startAt: ev.startAt.toISOString(),
    endAt: ev.endAt?.toISOString() ?? null,
    location: ev.location,
    notes: ev.notes,
    caseId: ev.caseId,
    caseTitle: ev.case?.title ?? null,
  };
}

export default async function CalendarPage() {
  const user = await requirePermission("events.view");
  const canManage = hasPermission(user.role, "events.manage");
  const now = new Date();

  const [upcoming, past, cases] = await Promise.all([
    prisma.event.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      include: { case: { select: { title: true } } },
    }),
    prisma.event.findMany({
      where: { startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      take: 50,
      include: { case: { select: { title: true } } },
    }),
    prisma.case.findMany({
      where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="التقويم والمواعيد" subtitle="جلسات المحاكم والاجتماعات والمواعيد النهائية" />
      <CalendarView
        canManage={canManage}
        upcoming={upcoming.map(map)}
        past={past.map(map)}
        cases={cases.map((c) => ({
          id: c.id,
          name: `${c.caseNumber} — ${c.title}`,
        }))}
      />
    </div>
  );
}
