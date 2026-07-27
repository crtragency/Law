import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { getPagination, parsePage } from "@/lib/pagination";
import { CasesList } from "./cases-list";

export const metadata = { title: "القضايا — نظام مكتب المحاماة" };

const PAGE_SIZE = 50;

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; create?: string }>;
}) {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user, "cases.manage");
  const params = await searchParams;
  const page = parsePage(params.page);

  const [cases, total, clients, lawyers] = await Promise.all([
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      ...getPagination(page, PAGE_SIZE),
      include: {
        client: { select: { name: true } },
        assignedLawyer: { select: { name: true } },
      },
    }),
    prisma.case.count(),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 300,
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "LAWYER", "PARALEGAL"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 100,
    }),
  ]);

  return (
    <div>
      <PageHeader title="القضايا" subtitle={`${total} قضية`} />
      <CasesList
        canManage={canManage}
        initialCreate={params.create === "1"}
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
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/cases" />
    </div>
  );
}
