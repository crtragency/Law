import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { IconCalendar, IconCheck, IconClock, IconMessage } from "@/components/icons";
import { MeetingsManager } from "./meetings-manager";

export const metadata = { title: "محاضر الاجتماعات — نظام مكتب المحاماة" };

function displayClient(client: { name: string; companyName: string | null; type: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function MeetingsPage() {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user.role, "cases.manage");
  const now = new Date();

  const [rows, clients, cases, users, openActions, upcomingMeetings, closedCount] = await Promise.all([
    prisma.meetingMinute.findMany({
      orderBy: { meetingAt: "desc" },
      include: {
        client: { select: { id: true, name: true, companyName: true, type: true } },
        case: { select: { id: true, title: true, caseNumber: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      take: 150,
    }),
    prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, companyName: true, type: true },
      take: 300,
    }),
    prisma.case.findMany({
      where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
      take: 300,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.meetingMinute.count({ where: { status: "ACTIONS_OPEN" } }),
    prisma.meetingMinute.count({ where: { nextMeetingAt: { gte: now } } }),
    prisma.meetingMinute.count({ where: { status: "CLOSED" } }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="محاضر الاجتماعات"
        subtitle="توثيق اجتماعات المكتب أو العميل وتحويل القرارات إلى بنود متابعة واضحة في المهام والتقويم."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="كل المحاضر" value={rows.length} icon={<IconMessage />} />
        <StatCard label="إجراءات مفتوحة" value={openActions} icon={<IconClock />} />
        <StatCard label="اجتماعات قادمة" value={upcomingMeetings} icon={<IconCalendar />} />
        <StatCard label="مغلقة" value={closedCount} icon={<IconCheck />} />
      </div>

      <MeetingsManager
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          meetingAt: row.meetingAt.toISOString(),
          location: row.location,
          attendees: row.attendees,
          agenda: row.agenda,
          decisions: row.decisions,
          actionItems: row.actionItems,
          status: row.status,
          nextMeetingAt: row.nextMeetingAt?.toISOString() ?? null,
          clientId: row.clientId,
          clientName: row.client ? displayClient(row.client) : null,
          caseId: row.caseId,
          caseTitle: row.case?.title ?? null,
          caseNumber: row.case?.caseNumber ?? null,
          assignedToId: row.assignedToId,
          assignedName: row.assignedTo?.name ?? null,
          notes: row.notes,
        }))}
        clients={clients.map((client) => ({ id: client.id, name: displayClient(client) }))}
        cases={cases.map((item) => ({ id: item.id, name: item.title, caseNumber: item.caseNumber }))}
        users={users}
        canManage={canManage}
      />
    </div>
  );
}
