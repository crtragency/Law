import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, StatCard } from "@/components/ui";
import { Icon, IconCheck, IconClock, IconFolder, IconPlus } from "@/components/icons";
import {
  LEGAL_SERVICE_MODULES,
  SERVICE_MODULE_CATEGORY_LABELS,
  SERVICE_MODULE_STATUS_COLORS,
  SERVICE_MODULE_STATUS_LABELS,
  type ServiceModuleCategory,
} from "@/lib/legal-service-modules";
import {
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_COLORS,
} from "@/lib/labels";
import { ServicesManager } from "./services-manager";

export const metadata = { title: "الخدمات والوحدات — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

const CATEGORY_ORDER: ServiceModuleCategory[] = [
  "operations",
  "relationships",
  "knowledge",
  "finance",
  "governance",
];

export default async function ServicesPage() {
  const user = await requirePermission("services.view");
  const canManage = hasPermission(user.role, "services.manage");

  const [requests, clients, cases, users] = await Promise.all([
    prisma.serviceRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { name: true, companyName: true, type: true } },
        case: { select: { title: true, caseNumber: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, type: true },
    }),
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, caseNumber: true, clientId: true },
      take: 200,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const openCount = requests.filter((request) => !["COMPLETED", "CANCELLED"].includes(request.status)).length;
  const urgentCount = requests.filter((request) => request.priority === "URGENT").length;
  const coveredAreas = new Set(LEGAL_SERVICE_MODULES.map((module) => module.serviceArea)).size;

  return (
    <div className="space-y-8">
      <PageHeader
        title="الخدمات والوحدات القانونية"
        subtitle="خريطة تغطية شاملة لاحتياجات مكتب المحاماة مع تشغيل أي خدمة جديدة من طلبات الخدمات"
        action={
          canManage ? (
            <a href="#new-service" className="btn-primary">
              <IconPlus className="h-4 w-4" /> طلب خدمة جديد
            </a>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="وحدات وخدمات" value={LEGAL_SERVICE_MODULES.length} icon={<IconFolder />} />
        <StatCard label="تصنيفات مغطاة" value={coveredAreas} icon={<IconCheck />} />
        <StatCard label="طلبات مفتوحة" value={openCount} icon={<IconClock />} />
        <StatCard label="عاجلة" value={urgentCount} icon={<Icon name="bell" />} />
      </div>

      <section className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const modules = LEGAL_SERVICE_MODULES.filter((module) => module.category === category);
          return (
            <div key={category}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-ink">
                  {SERVICE_MODULE_CATEGORY_LABELS[category]}
                </h2>
                <span className="text-xs text-gray-400">{modules.length} وحدة</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => (
                  <Link
                    key={module.slug}
                    href={`/services/${module.slug}`}
                    className="card block transition hover:border-brand-300 hover:bg-brand-50/20"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                        <Icon name={module.icon} className="h-5 w-5" />
                      </span>
                      <Badge className={SERVICE_MODULE_STATUS_COLORS[module.status]}>
                        {SERVICE_MODULE_STATUS_LABELS[module.status]}
                      </Badge>
                    </div>
                    <h3 className="font-display text-base font-bold text-ink">{module.title}</h3>
                    <p className="mt-1 min-h-[44px] text-sm leading-relaxed text-gray-500">
                      {module.summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className="text-xs text-gray-400">
                        {SERVICE_AREA_LABELS[module.serviceArea]}
                      </span>
                      <span className="text-xs font-semibold text-brand-700">تفاصيل الوحدة</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section id="new-service" className="scroll-mt-24">
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold text-ink">تشغيل الخدمات الجديدة</h2>
          <p className="mt-1 text-sm text-gray-500">
            أي خدمة غير موجودة كشاشة مستقلة تتسجل هنا، وتتربط بالموكل أو القضية أو الموظف المسؤول.
          </p>
        </div>
        <ServicesManager
          canManage={canManage}
          requests={requests.map((request) => ({
            id: request.id,
            title: request.title,
            serviceArea: request.serviceArea,
            status: request.status,
            priority: request.priority,
            description: request.description,
            dueDate: request.dueDate?.toISOString() ?? null,
            createdAt: request.createdAt.toISOString(),
            clientName: request.client
              ? request.client.type === "COMPANY" && request.client.companyName
                ? request.client.companyName
                : request.client.name
              : null,
            caseTitle: request.case?.title ?? null,
            caseNumber: request.case?.caseNumber ?? null,
            assignedToName: request.assignedTo?.name ?? null,
          }))}
          clients={clients.map((client) => ({
            id: client.id,
            name: client.type === "COMPANY" && client.companyName ? client.companyName : client.name,
          }))}
          cases={cases.map((c) => ({
            id: c.id,
            name: c.title,
            caseNumber: c.caseNumber,
            clientId: c.clientId,
          }))}
          users={users}
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">توزيع الطلبات حسب الحالة</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Object.keys(SERVICE_STATUS_LABELS).map((status) => {
            const count = requests.filter((request) => request.status === status).length;
            return (
              <div key={status} className="rounded-lg border border-line bg-white p-4">
                <Badge className={SERVICE_STATUS_COLORS[status]}>{SERVICE_STATUS_LABELS[status]}</Badge>
                <p className="mt-3 font-display text-2xl font-bold text-ink">{count}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}