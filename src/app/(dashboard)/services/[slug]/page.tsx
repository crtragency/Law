import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { Icon, IconCheck, IconChevronLeft } from "@/components/icons";
import {
  LEGAL_SERVICE_MODULES,
  SERVICE_MODULE_CATEGORY_LABELS,
  SERVICE_MODULE_STATUS_COLORS,
  SERVICE_MODULE_STATUS_LABELS,
  getLegalServiceModule,
} from "@/lib/legal-service-modules";
import {
  SERVICE_AREA_DESCRIPTIONS,
  SERVICE_AREA_LABELS,
} from "@/lib/labels";

export function generateStaticParams() {
  return LEGAL_SERVICE_MODULES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const serviceModule = getLegalServiceModule(slug);
  return {
    title: serviceModule ? `${serviceModule.title} — الخدمات والوحدات` : "الخدمات والوحدات",
  };
}

export default async function ServiceModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePermission("services.view");
  const { slug } = await params;
  const serviceModule = getLegalServiceModule(slug);
  if (!serviceModule) notFound();

  return (
    <div className="space-y-6">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <IconChevronLeft className="h-4 w-4" /> رجوع إلى الخدمات
      </Link>

      <PageHeader
        title={serviceModule.title}
        subtitle={serviceModule.description}
        action={
          serviceModule.primaryRoute ? (
            <Link href={serviceModule.primaryRoute} className="btn-primary">
              فتح الصفحة المرتبطة
            </Link>
          ) : (
            <Link href="/services#new-service" className="btn-primary">
              إنشاء طلب خدمة
            </Link>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card">
          <div className="mb-4 flex items-start justify-between gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700">
              <Icon name={serviceModule.icon} className="h-6 w-6" />
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge className={SERVICE_MODULE_STATUS_COLORS[serviceModule.status]}>
                {SERVICE_MODULE_STATUS_LABELS[serviceModule.status]}
              </Badge>
              <Badge className="bg-gray-100 text-gray-700">
                {SERVICE_MODULE_CATEGORY_LABELS[serviceModule.category]}
              </Badge>
            </div>
          </div>
          <h2 className="font-display text-lg font-bold text-ink">نطاق التغطية</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {SERVICE_AREA_DESCRIPTIONS[serviceModule.serviceArea]}
          </p>
          <div className="mt-4 rounded-md border border-line bg-paper/60 p-3 text-sm text-gray-700">
            التصنيف التشغيلي: <b>{SERVICE_AREA_LABELS[serviceModule.serviceArea]}</b>
          </div>
        </section>

        <section className="card">
          <h2 className="font-display text-lg font-bold text-ink">الصفحات المرتبطة</h2>
          <div className="mt-3 space-y-2">
            {serviceModule.relatedRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm text-gray-700 transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span>{route.label}</span>
                <span className="text-xs text-brand-700">فتح</span>
              </Link>
            ))}
            <Link
              href="/services#new-service"
              className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm text-gray-700 transition hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span>تسجيل طلب خدمة مرتبط بهذه الوحدة</span>
              <span className="text-xs text-brand-700">إضافة</span>
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">ما الذي تغطيه الوحدة؟</h2>
          <div className="grid gap-2">
            {serviceModule.features.map((feature) => (
              <div key={feature} className="flex items-start gap-2 rounded-md border border-line bg-white p-3 text-sm text-gray-700">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">سير العمل المقترح</h2>
          <ol className="space-y-2">
            {serviceModule.workflows.map((step, index) => (
              <li key={step} className="flex items-start gap-3 rounded-md border border-line bg-white p-3 text-sm text-gray-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-bold text-brand-700">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}