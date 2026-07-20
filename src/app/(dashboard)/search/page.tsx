import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, PageHeader } from "@/components/ui";
import { IconSearch } from "@/components/icons";
import {
  CONTACT_TYPE_LABELS,
  EXPENSE_STATUS_COLORS,
  EXPENSE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LEGAL_TEMPLATE_CATEGORY_LABELS,
  POWER_STATUS_COLORS,
  POWER_STATUS_LABELS,
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  formatDate,
} from "@/lib/labels";

export const metadata = { title: "البحث العام — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string | string[] }>;

type SearchResult = {
  id: string;
  title: string;
  href: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  meta?: string;
};

function getQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

function displayClient(client: { name: string; companyName?: string | null; type?: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("search.view");
  const { q } = await searchParams;
  const query = getQuery(q);
  const textFilter = { contains: query, mode: "insensitive" as const };

  const empty = {
    clients: [],
    cases: [],
    contacts: [],
    powers: [],
    invoices: [],
    expenses: [],
    templates: [],
    requests: [],
    contracts: [],
  };

  const data = query
    ? await Promise.all([
        prisma.client.findMany({
          where: {
            OR: [
              { name: textFilter },
              { companyName: textFilter },
              { phone: textFilter },
              { email: textFilter },
              { nationalId: textFilter },
              { unifiedNumber: textFilter },
              { taxNumber: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.case.findMany({
          where: {
            OR: [
              { caseNumber: textFilter },
              { title: textFilter },
              { court: textFilter },
              { description: textFilter },
            ],
          },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.legalContact.findMany({
          where: {
            OR: [
              { name: textFilter },
              { organization: textFilter },
              { roleTitle: textFilter },
              { phone: textFilter },
              { email: textFilter },
              { notes: textFilter },
            ],
          },
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            case: { select: { title: true, caseNumber: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.powerOfAttorney.findMany({
          where: {
            OR: [
              { number: textFilter },
              { title: textFilter },
              { issuer: textFilter },
              { representative: textFilter },
              { scope: textFilter },
              { notes: textFilter },
            ],
          },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.invoice.findMany({
          where: { OR: [{ number: textFilter }, { notes: textFilter }] },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.judicialExpense.findMany({
          where: {
            OR: [
              { title: textFilter },
              { vendor: textFilter },
              { receiptUrl: textFilter },
              { notes: textFilter },
            ],
          },
          include: { case: { select: { title: true, caseNumber: true } } },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.legalTemplate.findMany({
          where: {
            OR: [
              { title: textFilter },
              { body: textFilter },
              { variables: textFilter },
              { notes: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.serviceRequest.findMany({
          where: { OR: [{ title: textFilter }, { description: textFilter }] },
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            case: { select: { title: true, caseNumber: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.contract.findMany({
          where: { OR: [{ number: textFilter }, { scope: textFilter }, { notes: textFilter }] },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
      ]).then(
        ([
          clients,
          cases,
          contacts,
          powers,
          invoices,
          expenses,
          templates,
          requests,
          contracts,
        ]) => ({
          clients,
          cases,
          contacts,
          powers,
          invoices,
          expenses,
          templates,
          requests,
          contracts,
        }),
      )
    : empty;

  const groups: { title: string; results: SearchResult[] }[] = [
    {
      title: "الموكلون",
      results: data.clients.map((client) => ({
        id: client.id,
        title: displayClient(client),
        href: `/clients/${client.id}`,
        subtitle: client.email ?? client.phone ?? client.address ?? undefined,
        badge: client.type === "COMPANY" ? "منشأة" : "فرد",
      })),
    },
    {
      title: "القضايا",
      results: data.cases.map((item) => ({
        id: item.id,
        title: item.title,
        href: `/cases/${item.id}`,
        subtitle: `${item.caseNumber} — ${displayClient(item.client)}`,
        meta: item.court ?? undefined,
      })),
    },
    {
      title: "جهات الاتصال",
      results: data.contacts.map((item) => ({
        id: item.id,
        title: item.name,
        href: "/contacts",
        subtitle: item.organization ?? item.roleTitle ?? item.phone ?? undefined,
        badge: CONTACT_TYPE_LABELS[item.type],
        meta: item.case ? `${item.case.caseNumber} — ${item.case.title}` : undefined,
      })),
    },
    {
      title: "التوكيلات",
      results: data.powers.map((item) => ({
        id: item.id,
        title: item.title,
        href: "/powers",
        subtitle: `${item.number} — ${displayClient(item.client)}`,
        badge: POWER_STATUS_LABELS[item.status],
        badgeClass: POWER_STATUS_COLORS[item.status],
        meta: item.expiresAt ? `تنتهي في ${formatDate(item.expiresAt)}` : undefined,
      })),
    },
    {
      title: "الفواتير",
      results: data.invoices.map((item) => ({
        id: item.id,
        title: item.number,
        href: "/finance",
        subtitle: displayClient(item.client),
        badge: INVOICE_STATUS_LABELS[item.status],
        badgeClass: INVOICE_STATUS_COLORS[item.status],
        meta: item.dueDate ? `استحقاق ${formatDate(item.dueDate)}` : undefined,
      })),
    },
    {
      title: "المصروفات القضائية",
      results: data.expenses.map((item) => ({
        id: item.id,
        title: item.title,
        href: "/finance",
        subtitle: item.case ? `${item.case.caseNumber} — ${item.case.title}` : item.vendor ?? undefined,
        badge: EXPENSE_STATUS_LABELS[item.status],
        badgeClass: EXPENSE_STATUS_COLORS[item.status],
      })),
    },
    {
      title: "النماذج القانونية",
      results: data.templates.map((item) => ({
        id: item.id,
        title: item.title,
        href: "/templates",
        subtitle: item.notes ?? undefined,
        badge: LEGAL_TEMPLATE_CATEGORY_LABELS[item.category],
      })),
    },
    {
      title: "طلبات الخدمات",
      results: data.requests.map((item) => ({
        id: item.id,
        title: item.title,
        href: "/services",
        subtitle: SERVICE_AREA_LABELS[item.serviceArea],
        badge: SERVICE_STATUS_LABELS[item.status],
        badgeClass: SERVICE_STATUS_COLORS[item.status],
        meta: item.case ? `${item.case.caseNumber} — ${item.case.title}` : undefined,
      })),
    },
    {
      title: "اتفاقيات الأتعاب",
      results: data.contracts.map((item) => ({
        id: item.id,
        title: item.number,
        href: "/contracts",
        subtitle: displayClient(item.client),
        meta: item.scope,
      })),
    },
  ];

  const total = groups.reduce((sum, group) => sum + group.results.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="البحث العام"
        subtitle="بحث موحد داخل الموكلين، القضايا، جهات الاتصال، التوكيلات، الفواتير، المصروفات، النماذج، والخدمات"
      />

      <form className="card flex flex-col gap-3 md:flex-row" action="/search">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            className="field pr-9"
            placeholder="اكتب اسم موكل، رقم قضية، فاتورة، توكيل، جهة..."
          />
        </div>
        <button type="submit" className="btn-primary md:w-36">
          بحث
        </button>
      </form>

      {query && (
        <div className="text-sm text-gray-500">
          تم العثور على <span className="font-semibold text-ink">{total}</span> نتيجة عن <span>&quot;{query}&quot;</span>
        </div>
      )}

      {!query ? (
        <div className="card text-sm leading-7 text-gray-500">
          ابدأ بكتابة كلمة مفتاحية للبحث في كل بيانات المكتب القانونية والمالية من مكان واحد.
        </div>
      ) : total === 0 ? (
        <div className="card text-sm text-gray-500">لا توجد نتائج مطابقة.</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {groups
            .filter((group) => group.results.length > 0)
            .map((group) => (
              <section key={group.title}>
                <h2 className="mb-3 font-display text-lg font-bold text-ink">{group.title}</h2>
                <div className="data-panel divide-y divide-gray-100">
                  {group.results.map((result) => (
                    <Link key={`${group.title}-${result.id}`} href={result.href} className="block p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-800">{result.title}</p>
                          {result.subtitle && <p className="mt-1 text-xs text-gray-500">{result.subtitle}</p>}
                          {result.meta && <p className="mt-1 line-clamp-1 text-xs text-gray-400">{result.meta}</p>}
                        </div>
                        {result.badge && (
                          <Badge className={result.badgeClass ?? "bg-gray-100 text-gray-700"}>{result.badge}</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
