import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { IconClock, IconFileText, IconInbox, IconSend } from "@/components/icons";
import { CorrespondenceManager } from "./correspondence-manager";

export const metadata = { title: "الوارد والصادر — نظام مكتب المحاماة" };

function displayClient(client: { name: string; companyName: string | null; type: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function CorrespondencePage() {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user.role, "cases.manage");
  const now = new Date();

  const [rows, clients, cases, users, totalCount, incomingCount, outgoingCount, dueCount] = await Promise.all([
    prisma.correspondenceRegister.findMany({
      orderBy: { updatedAt: "desc" },
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
    prisma.correspondenceRegister.count(),
    prisma.correspondenceRegister.count({ where: { direction: "INCOMING" } }),
    prisma.correspondenceRegister.count({ where: { direction: "OUTGOING" } }),
    prisma.correspondenceRegister.count({ where: { dueAt: { gte: now }, status: { notIn: ["ARCHIVED"] } } }),
  ]);

  const year = new Date().getFullYear();
  const suggestedNumber = `CR-${year}-${String(totalCount + 1).padStart(4, "0")}`;

  return (
    <div className="space-y-7">
      <PageHeader
        title="دفتر الوارد والصادر"
        subtitle="قيد مركزي للمراسلات الرسمية والردود والمرفقات، مع تحويل مواعيد الرد لمهام واضحة."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="كل القيود" value={totalCount} icon={<IconFileText />} />
        <StatCard label="وارد" value={incomingCount} icon={<IconInbox />} />
        <StatCard label="صادر" value={outgoingCount} icon={<IconSend />} />
        <StatCard label="ردود منتظرة" value={dueCount} icon={<IconClock />} />
      </div>

      <CorrespondenceManager
        rows={rows.map((row) => ({
          id: row.id,
          number: row.number,
          title: row.title,
          direction: row.direction,
          status: row.status,
          importance: row.importance,
          sender: row.sender,
          recipient: row.recipient,
          deliveryMethod: row.deliveryMethod,
          referenceNumber: row.referenceNumber,
          summary: row.summary,
          attachmentUrl: row.attachmentUrl,
          receivedAt: row.receivedAt?.toISOString() ?? null,
          sentAt: row.sentAt?.toISOString() ?? null,
          dueAt: row.dueAt?.toISOString() ?? null,
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
        suggestedNumber={suggestedNumber}
        canManage={canManage}
      />
    </div>
  );
}
