import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { IconPlus, IconFileText, IconPen } from "@/components/icons";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, formatDate } from "@/lib/labels";
import { formatMoneyLabel, computeTax } from "@/lib/money";

export const metadata = { title: "اتفاقيات الأتعاب — نظام مكتب المحاماة" };

export default async function ContractsPage() {
  const user = await requirePermission("contracts.view");
  const canManage = hasPermission(user.role, "contracts.manage");

  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, companyName: true, type: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="اتفاقيات الأتعاب"
        subtitle={`${contracts.length} اتفاقية`}
        action={
          canManage ? (
            <Link href="/contracts/new" className="btn-primary">
              <IconPlus className="h-4 w-4" /> اتفاقية جديدة
            </Link>
          ) : undefined
        }
      />

      {contracts.length === 0 ? (
        <EmptyState
          icon={<IconFileText />}
          title="لا توجد اتفاقيات بعد"
          hint={canManage ? "ابدأ بإنشاء اتفاقية أتعاب جديدة" : undefined}
        />
      ) : (
        <div className="data-panel overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="border-b border-line bg-paper/60">
              <tr>
                <th className="table-th">رقم الاتفاقية</th>
                <th className="table-th">الموكّل</th>
                <th className="table-th">قبل الضريبة</th>
                <th className="table-th">الضريبة</th>
                <th className="table-th">الإجمالي</th>
                <th className="table-th">التاريخ</th>
                <th className="table-th">الحالة</th>
                <th className="table-th">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => {
                const { beforeTax, tax, total } = computeTax(c.amountBeforeTax, c.taxRate);
                const clientName =
                  c.client.type === "COMPANY" && c.client.companyName
                    ? c.client.companyName
                    : c.client.name;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium" dir="ltr">
                      <Link href={`/contracts/${c.id}`} className="text-brand-700 hover:underline">
                        {c.number}
                      </Link>
                    </td>
                    <td className="table-td">{clientName}</td>
                    <td className="table-td" dir="ltr">{formatMoneyLabel(beforeTax)}</td>
                    <td className="table-td" dir="ltr">{formatMoneyLabel(tax)}</td>
                    <td className="table-td" dir="ltr">{formatMoneyLabel(total)}</td>
                    <td className="table-td text-xs text-gray-500">
                      {c.dateHijri || formatDate(c.dateGregorian)}
                    </td>
                    <td className="table-td">
                      <Badge className={CONTRACT_STATUS_COLORS[c.status]}>
                        {CONTRACT_STATUS_LABELS[c.status]}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/contracts/${c.id}`}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                        >
                          <IconFileText className="h-4 w-4" />
                          فتح
                        </Link>
                        {canManage && (
                          <Link
                            href={`/contracts/${c.id}/edit`}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-brass-700 transition hover:bg-brass-50"
                          >
                            <IconPen className="h-4 w-4" />
                            تعديل
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
