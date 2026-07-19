import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFirmSettings } from "@/lib/firm";
import { PageHeader } from "@/components/ui";
import { ContractForm } from "../contract-form";

export const metadata = { title: "اتفاقية جديدة — نظام مكتب المحاماة" };

export default async function NewContractPage() {
  await requirePermission("contracts.manage");
  const [clients, cases, firm] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, type: true },
    }),
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, caseNumber: true, title: true },
    }),
    getFirmSettings(),
  ]);

  return (
    <div>
      <PageHeader title="اتفاقية أتعاب جديدة" subtitle="املأ الخانات وسيُولّد العقد تلقائياً" />
      <ContractForm
        clients={clients.map((c) => ({
          id: c.id,
          name: c.type === "COMPANY" && c.companyName ? c.companyName : c.name,
        }))}
        cases={cases.map((c) => ({ id: c.id, name: `${c.caseNumber} — ${c.title}` }))}
        values={{
          number: "",
          clientId: "",
          caseId: "",
          city: firm.city ?? firm.address ?? "",
          dateHijri: "",
          dateGregorian: "",
          scope: "",
          amountBeforeTaxRiyals: "",
          taxRate: 15,
          installments: [{ amountRiyals: "", note: "", paid: false }],
          status: "DRAFT",
        }}
      />
    </div>
  );
}
