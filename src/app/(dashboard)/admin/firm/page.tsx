import { requirePermission } from "@/lib/auth";
import { getFirmSettings } from "@/lib/firm";
import { PageHeader } from "@/components/ui";
import { FirmForm } from "./firm-form";

export const metadata = { title: "بيانات الشركة — نظام مكتب المحاماة" };

export default async function FirmPage() {
  await requirePermission("firm.manage");
  const firm = await getFirmSettings();

  return (
    <div>
      <PageHeader
        title="بيانات الشركة"
        subtitle="تُستخدم هذه البيانات كـ«الطرف الأول» في اتفاقيات الأتعاب وفي ترويسة المستندات"
      />
      <FirmForm firm={firm} />
    </div>
  );
}
