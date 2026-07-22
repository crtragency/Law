import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { IconCheck, IconClock, IconFileText, IconScale } from "@/components/icons";
import { SettlementsManager } from "./settlements-manager";

export const metadata = { title: "التسويات والعروض — نظام مكتب المحاماة" };

function displayClient(client: { name: string; companyName: string | null; type: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function SettlementsPage() {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user, "cases.manage");
  const now = new Date();

  const [rows, clients, cases, users, negotiating, signed, dueSoon] = await Promise.all([
    prisma.settlementOffer.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, companyName: true, type: true } },
        case: { select: { id: true, title: true, caseNumber: true, clientId: true } },
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
    prisma.settlementOffer.count({ where: { status: "NEGOTIATING" } }),
    prisma.settlementOffer.count({ where: { status: "SIGNED" } }),
    prisma.settlementOffer.count({
      where: {
        responseDueAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        status: { in: ["PROPOSED", "NEGOTIATING"] },
      },
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="التسويات والعروض"
        subtitle="إدارة عروض التسوية والمفاوضات المرتبطة بالقضايا، مع حساب الضريبة ومهلة الرد والمتابعة."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="كل العروض" value={rows.length} icon={<IconScale />} />
        <StatCard label="تحت التفاوض" value={negotiating} icon={<IconClock />} />
        <StatCard label="موقعة" value={signed} icon={<IconCheck />} />
        <StatCard label="مهلة خلال أسبوع" value={dueSoon} icon={<IconFileText />} />
      </div>

      <SettlementsManager
        rows={rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          offeredBy: row.offeredBy,
          amountBeforeTax: row.amountBeforeTax,
          taxRate: row.taxRate,
          terms: row.terms,
          offerDate: row.offerDate.toISOString(),
          responseDueAt: row.responseDueAt?.toISOString() ?? null,
          signedAt: row.signedAt?.toISOString() ?? null,
          clientId: row.clientId,
          clientName: row.client ? displayClient(row.client) : null,
          caseId: row.caseId,
          caseTitle: row.case.title,
          caseNumber: row.case.caseNumber,
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
