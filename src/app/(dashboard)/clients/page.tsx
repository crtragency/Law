import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { ClientsManager } from "./clients-manager";

export const metadata = { title: "الموكّلون — نظام مكتب المحاماة" };

export default async function ClientsPage() {
  const user = await requirePermission("clients.view");
  const canManage = hasPermission(user.role, "clients.manage");

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cases: true } } },
  });

  return (
    <div>
      <PageHeader
        title="الموكّلون"
        subtitle={`${clients.length} موكّل مسجّل`}
      />
      {clients.length === 0 && !canManage ? (
        <EmptyState icon="👥" title="لا يوجد موكّلون بعد" />
      ) : (
        <ClientsManager
          canManage={canManage}
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            nationalId: c.nationalId,
            phone: c.phone,
            email: c.email,
            address: c.address,
            notes: c.notes,
            caseCount: c._count.cases,
          }))}
        />
      )}
    </div>
  );
}
