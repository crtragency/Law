import { requirePermission } from "@/lib/auth";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { IconCheck, IconClock, IconShield } from "@/components/icons";
import {
  getProductionReadinessChecks,
  readinessSummary,
  type ReadinessLevel,
} from "@/lib/production-readiness";

export const metadata = { title: "جاهزية التشغيل — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

const LEVEL_LABELS: Record<ReadinessLevel, string> = {
  ready: "جاهز",
  warning: "تنبيه",
  missing: "ناقص",
};

const LEVEL_COLORS: Record<ReadinessLevel, string> = {
  ready: "bg-brand-50 text-brand-800",
  warning: "bg-brass-50 text-brass-800",
  missing: "bg-seal-50 text-seal-700",
};

export default async function ProductionPage() {
  await requirePermission("audit.view");
  const checks = getProductionReadinessChecks();
  const summary = readinessSummary(checks);
  const categories = [...new Set(checks.map((check) => check.category))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="جاهزية التشغيل"
        subtitle="فحص سريع للبيئة قبل الاعتماد على النظام في الإنتاج"
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="إجمالي الفحوصات" value={summary.total} icon={<IconShield />} />
        <StatCard label="جاهز" value={summary.ready} icon={<IconCheck />} />
        <StatCard label="تنبيهات" value={summary.warning} icon={<IconClock />} />
        <StatCard label="نواقص" value={summary.missing} icon={<IconShield />} />
      </div>

      <div className="columns-1 gap-6 xl:columns-2">
        {categories.map((category) => (
          <section key={category} className="mb-6 break-inside-avoid data-panel">
            <div className="border-b border-line p-5">
              <h2 className="section-title">{category}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {checks.filter((check) => check.category === category).map((check) => (
                <div key={check.key} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{check.label}</p>
                      <p className="mt-1 text-xs text-gray-400" dir="ltr">{check.key}: {check.value}</p>
                    </div>
                    <Badge className={LEVEL_COLORS[check.level]}>{LEVEL_LABELS[check.level]}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-gray-500">{check.hint}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
