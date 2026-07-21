import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalClient } from "@/lib/portal-session";
import { prisma } from "@/lib/prisma";
import { getFirmSettings } from "@/lib/firm";
import { Badge } from "@/components/ui";
import { IconCheck, IconFileText } from "@/components/icons";
import {
  CONTRACT_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/labels";
import { ContractDocument } from "@/app/(dashboard)/contracts/[id]/contract-document";
import { signPortalContractAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const client = await requirePortalClient();
  const { id } = await params;

  const [contract, firm] = await Promise.all([
    prisma.contract.findFirst({
      where: {
        id,
        clientId: client.id,
        status: { in: ["SENT", "CLIENT_SIGNED", "ACTIVE", "COMPLETED"] },
      },
      include: { client: true },
    }),
    getFirmSettings(),
  ]);

  if (!contract) notFound();

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href="/portal" className="text-sm font-semibold text-brand-700 hover:underline">
          رجوع إلى ملفك القانوني
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">اتفاقية أتعاب</p>
            <h1 className="page-title" dir="ltr">{contract.number}</h1>
          </div>
          <Badge className={CONTRACT_STATUS_COLORS[contract.status]}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </Badge>
        </div>
      </div>

      <div className="no-print rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.035]">
        {contract.status === "SENT" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">الاتفاقية بانتظار توقيعك</p>
              <p className="mt-1 text-sm text-gray-500">
                راجع البنود والمبالغ والدفعات، ثم أكد توقيعك إلكترونياً لإرسالها لاعتماد المكتب.
              </p>
            </div>
            <form action={signPortalContractAction}>
              <input type="hidden" name="id" value={contract.id} />
              <button type="submit" className="btn-primary">
                <IconCheck className="h-4 w-4" />
                تأكيد التوقيع الإلكتروني
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-brand-800">
            <IconFileText className="h-5 w-5" />
            {contract.status === "CLIENT_SIGNED"
              ? "تم توقيع الاتفاقية من طرفك وهي بانتظار اعتماد المكتب."
              : "يمكنك حفظ نسخة PDF من المتصفح أو الرجوع إليها من البوابة."}
          </div>
        )}
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
