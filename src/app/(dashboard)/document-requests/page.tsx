import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { IconCheck, IconClock, IconFileText, IconInbox } from "@/components/icons";
import { DocumentRequestsManager } from "./document-requests-manager";

export const metadata = { title: "طلبات المستندات — نظام مكتب المحاماة" };

export default async function DocumentRequestsPage() {
  const user = await requirePermission("documents.view");
  const canManage = hasPermission(user.role, "documents.manage");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [rows, cases, users, requestedCount, receivedCount, overdueCount] = await Promise.all([
    prisma.documentRequest.findMany({
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        case: { select: { id: true, title: true, caseNumber: true, client: { select: { name: true, companyName: true, type: true } } } },
        createdBy: { select: { name: true } },
      },
      take: 200,
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
    prisma.documentRequest.count({ where: { status: "REQUESTED" } }),
    prisma.documentRequest.count({ where: { status: "RECEIVED" } }),
    prisma.documentRequest.count({ where: { status: "REQUESTED", dueDate: { lt: today } } }),
  ]);

  function displayClient(client: { name: string; companyName: string | null; type: string }) {
    return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="مركز طلبات المستندات"
        subtitle="متابعة كل المستندات المطلوبة من العملاء في شاشة واحدة، مع الحالة والمهلة والقضية المرتبطة."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="كل الطلبات" value={rows.length} icon={<IconFileText />} />
        <StatCard label="مطلوب من العميل" value={requestedCount} icon={<IconInbox />} />
        <StatCard label="تم الاستلام" value={receivedCount} icon={<IconCheck />} />
        <StatCard label="متأخر" value={overdueCount} icon={<IconClock />} />
      </div>

      <DocumentRequestsManager
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          description: row.description,
          dueDate: row.dueDate?.toISOString() ?? null,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          caseId: row.caseId,
          caseTitle: row.case.title,
          caseNumber: row.case.caseNumber,
          clientName: displayClient(row.case.client),
          createdByName: row.createdBy?.name ?? null,
        }))}
        cases={cases.map((item) => ({ id: item.id, name: item.title, caseNumber: item.caseNumber }))}
        users={users}
        canManage={canManage}
      />
    </div>
  );
}
