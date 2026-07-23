import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { RequestsManager } from "./requests-manager";

export const metadata = { title: "طلبات الموظفين — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireUser();
  const canManage = hasPermission(user, "employeeRequests.manage");
  const requests = await prisma.employeeRequest.findMany({
    where: canManage ? {} : { requestedById: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 160,
    include: {
      requestedBy: {
        select: { name: true, email: true, role: true },
      },
      decidedBy: {
        select: { name: true },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="طلبات الموظفين"
        subtitle="إدارة الإجازات والأذونات والطلبات الداخلية من تقديم الطلب حتى الموافقة أو الرفض."
      />
      <RequestsManager
        currentUserId={user.id}
        canManage={canManage}
        requests={requests.map((request) => ({
          id: request.id,
          type: request.type,
          status: request.status,
          subject: request.subject,
          reason: request.reason,
          startDate: request.startDate?.toISOString() ?? null,
          endDate: request.endDate?.toISOString() ?? null,
          decisionNote: request.decisionNote,
          decidedAt: request.decidedAt?.toISOString() ?? null,
          createdAt: request.createdAt.toISOString(),
          requestedById: request.requestedById,
          requestedBy: request.requestedBy,
          decidedBy: request.decidedBy,
        }))}
      />
    </div>
  );
}
