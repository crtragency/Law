import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { DeadlineCalculator } from "./deadline-calculator";

export const metadata = { title: "حاسبة المدد — نظام مكتب المحاماة" };

export default async function DeadlinesPage() {
  await requireUser();

  return (
    <div className="space-y-7">
      <PageHeader
        title="حاسبة المدد"
        subtitle="أداة داخلية سريعة لحساب آخر موعد والتذكيرات المقترحة بدون أي اشتراكات أو خدمات خارجية."
      />
      <DeadlineCalculator />
    </div>
  );
}
