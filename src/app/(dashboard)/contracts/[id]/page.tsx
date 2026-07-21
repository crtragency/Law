import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getFirmSettings } from "@/lib/firm";
import { Badge } from "@/components/ui";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from "@/lib/labels";
import { ContractDocument } from "./contract-document";
import { ContractActionsBar } from "./actions-bar";

const FLOW_STEPS = ["DRAFT", "SENT", "CLIENT_SIGNED", "ACTIVE", "COMPLETED"] as const;

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("contracts.view");
  const canManage = hasPermission(user.role, "contracts.manage");
  const { id } = await params;

  const [contract, firm] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: { client: true },
    }),
    getFirmSettings(),
  ]);

  if (!contract) notFound();
  const currentStep = FLOW_STEPS.includes(contract.status as (typeof FLOW_STEPS)[number])
    ? FLOW_STEPS.indexOf(contract.status as (typeof FLOW_STEPS)[number])
    : -1;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/contracts" className="text-sm font-medium text-brand-700 hover:underline">
            رجوع إلى الاتفاقيات
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="page-title" dir="ltr">{contract.number}</h1>
            <Badge className={CONTRACT_STATUS_COLORS[contract.status]}>
              {CONTRACT_STATUS_LABELS[contract.status]}
            </Badge>
          </div>
        </div>
        <ContractActionsBar id={contract.id} canManage={canManage} status={contract.status} />
      </div>

      <div className="no-print data-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          {FLOW_STEPS.map((step, index) => {
            const done = currentStep >= index;
            return (
              <div
                key={step}
                className={`flex min-w-[150px] flex-1 items-center justify-center rounded-xl border px-3 py-2 text-center text-xs font-bold ${
                  done
                    ? "border-brand-100 bg-brand-50 text-brand-800"
                    : "border-line bg-paper text-gray-400"
                }`}
              >
                {CONTRACT_STATUS_LABELS[step]}
              </div>
            );
          })}
        </div>
      </div>

      <ContractDocument
        firm={firm}
        client={{
          type: contract.client.type,
          name: contract.client.name,
          nationalId: contract.client.nationalId,
          nationality: contract.client.nationality,
          companyName: contract.client.companyName,
          unifiedNumber: contract.client.unifiedNumber,
          taxNumber: contract.client.taxNumber,
          address: contract.client.address,
          phone: contract.client.phone,
        }}
        contract={{
          number: contract.number,
          city: contract.city,
          dateHijri: contract.dateHijri,
          dateGregorian: contract.dateGregorian,
          scope: contract.scope,
          amountBeforeTax: contract.amountBeforeTax,
          taxRate: contract.taxRate,
          installments: contract.installments,
        }}
      />
    </div>
  );
}
