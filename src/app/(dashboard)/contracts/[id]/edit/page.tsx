import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { parseInstallments } from "@/lib/money";
import { ContractForm } from "../../contract-form";

export const metadata = { title: "تعديل الاتفاقية — نظام مكتب المحاماة" };

const toRiyals = (halalas: number) => (halalas / 100).toString();

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("contracts.manage");
  const { id } = await params;

  const [contract, clients, cases] = await Promise.all([
    prisma.contract.findUnique({ where: { id } }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, type: true },
    }),
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, caseNumber: true, title: true },
    }),
  ]);

  if (!contract) notFound();

  const installments = parseInstallments(contract.installments);

  return (
    <div>
      <PageHeader title={`تعديل الاتفاقية ${contract.number}`} />
      <ContractForm
        clients={clients.map((c) => ({
          id: c.id,
          name: c.type === "COMPANY" && c.companyName ? c.companyName : c.name,
        }))}
        cases={cases.map((c) => ({ id: c.id, name: `${c.caseNumber} — ${c.title}` }))}
        values={{
          id: contract.id,
          number: contract.number,
          clientId: contract.clientId,
          caseId: contract.caseId ?? "",
          city: contract.city ?? "",
          dateHijri: contract.dateHijri ?? "",
          dateGregorian: contract.dateGregorian
            ? contract.dateGregorian.toISOString().slice(0, 10)
            : "",
          scope: contract.scope,
          amountBeforeTaxRiyals: toRiyals(contract.amountBeforeTax),
          taxRate: contract.taxRate,
          installments:
            installments.length > 0
              ? installments.map((i) => ({
                  amountRiyals: toRiyals(i.amount),
                  note: i.note,
                  paid: i.paid,
                }))
              : [{ amountRiyals: "", note: "", paid: false }],
          notes: contract.notes ?? "",
          status: contract.status,
        }}
      />
    </div>
  );
}
