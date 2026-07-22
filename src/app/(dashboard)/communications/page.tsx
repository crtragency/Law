import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { IconClock, IconMessage, IconPhone, IconUsers } from "@/components/icons";
import { CommunicationsManager } from "./communications-manager";

export const metadata = { title: "سجل الاتصالات — نظام مكتب المحاماة" };

function displayClient(client: { name: string; companyName: string | null; type: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function CommunicationsPage() {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user, "cases.manage");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [rows, clients, cases, users, todayCount, followUps] = await Promise.all([
    prisma.communicationLog.findMany({
      orderBy: { occurredAt: "desc" },
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
      select: { id: true, title: true, caseNumber: true, clientId: true },
      take: 300,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.communicationLog.count({ where: { occurredAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.communicationLog.count({ where: { outcome: "NEEDS_FOLLOWUP" } }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="سجل الاتصالات والمتابعات"
        subtitle="توثيق كل مكالمة أو واتساب أو بريد وربطها بالعميل والقضية، مع تحويل المتابعات لمهام تلقائية."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي السجلات" value={rows.length} icon={<IconPhone />} />
        <StatCard label="تواصلات اليوم" value={todayCount} icon={<IconClock />} />
        <StatCard label="تحتاج متابعة" value={followUps} icon={<IconMessage />} />
        <StatCard label="موظفون متاحون" value={users.length} icon={<IconUsers />} />
      </div>

      <CommunicationsManager
        rows={rows.map((row) => ({
          id: row.id,
          subject: row.subject,
          direction: row.direction,
          channel: row.channel,
          outcome: row.outcome,
          summary: row.summary,
          contactName: row.contactName,
          contactInfo: row.contactInfo,
          occurredAt: row.occurredAt.toISOString(),
          nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
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
        cases={cases.map((item) => ({ id: item.id, name: item.title, caseNumber: item.caseNumber, clientId: item.clientId }))}
        users={users}
        canManage={canManage}
      />
    </div>
  );
}
