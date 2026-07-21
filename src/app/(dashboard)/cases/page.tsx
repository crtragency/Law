import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { CasesList } from "./cases-list";

export const metadata = { title: "القضايا — نظام مكتب المحاماة" };

export default async function CasesPage() {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user.role, "cases.manage");

  const [cases, clients, lawyers] = await Promise.all([
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        assignedLawyer: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "LAWYER", "PARALEGAL"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="القضايا" subtitle={`${cases.length} قضية`} />
      <CasesList
        canManage={canManage}
        clients={clients}
        lawyers={lawyers}
        cases={cases.map((c) => ({
          id: c.id,
          caseNumber: c.caseNumber,
          title: c.title,
          status: c.status,
          caseType: c.caseType,
          clientId: c.clientId,
          court: c.court,
          assignedLawyerId: c.assignedLawyerId,
          description: c.description,
          clientName: c.client.name,
          lawyerName: c.assignedLawyer?.name ?? null,
        }))}
      />
    </div>
  );
}
