import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { getPagination, parsePage } from "@/lib/pagination";
import { ClientsManager } from "./clients-manager";

export const metadata = { title: "الموكّلون — نظام مكتب المحاماة" };

const PAGE_SIZE = 48;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; create?: string }>;
}) {
  const user = await requirePermission("clients.view");
  const canManage = hasPermission(user, "clients.manage");
  const canViewFinance = hasPermission(user, "finance.view");
  const params = await searchParams;
  const page = parsePage(params.page);

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      ...getPagination(page, PAGE_SIZE),
      include: { _count: { select: { cases: true } } },
    }),
    prisma.client.count(),
  ]);

  return (
    <div>
      <PageHeader
        title="الموكّلون"
        subtitle={`${total} موكّل مسجّل`}
      />
      {clients.length === 0 && !canManage ? (
        <EmptyState title="لا يوجد موكّلون بعد" />
      ) : (
        <ClientsManager
          canManage={canManage}
          canViewFinance={canViewFinance}
          initialCreate={params.create === "1"}
          clients={clients.map((c) => ({
            id: c.id,
            type: c.type,
            name: c.name,
            nationalId: c.nationalId,
            nationality: c.nationality,
            companyName: c.companyName,
            unifiedNumber: c.unifiedNumber,
            taxNumber: c.taxNumber,
            phone: c.phone,
            email: c.email,
            address: c.address,
            notes: c.notes,
            caseCount: c._count.cases,
            portalEnabled: c.portalEnabled,
            portalEmail: c.portalEmail,
          }))}
        />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/clients" />
    </div>
  );
}
