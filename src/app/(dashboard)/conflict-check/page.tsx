import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, EmptyState, StatCard } from "@/components/ui";
import { CONTACT_TYPE_LABELS, CASE_STATUS_LABELS, POWER_STATUS_LABELS, formatDate } from "@/lib/labels";
import { IconFolder, IconSearch, IconShield, IconUsers } from "@/components/icons";

export const metadata = { title: "فحص التعارض — نظام مكتب المحاماة" };

function displayClient(client: { name: string; companyName?: string | null; type?: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function ConflictCheckPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("clients.view");
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const canViewCases = hasPermission(user.role, "cases.view");
  const canViewContacts = hasPermission(user.role, "contacts.view");
  const canViewPowers = hasPermission(user.role, "powers.view");
  const textFilter = query ? { contains: query, mode: "insensitive" as const } : undefined;

  const [clients, cases, contacts, powers] = query
    ? await Promise.all([
        prisma.client.findMany({
          where: {
            OR: [
              { name: textFilter },
              { companyName: textFilter },
              { nationalId: textFilter },
              { unifiedNumber: textFilter },
              { taxNumber: textFilter },
              { phone: textFilter },
              { email: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
        }),
        canViewCases
          ? prisma.case.findMany({
              where: {
                OR: [
                  { title: textFilter },
                  { caseNumber: textFilter },
                  { description: textFilter },
                  { client: { is: { name: textFilter } } },
                  { client: { is: { companyName: textFilter } } },
                ],
              },
              include: { client: { select: { name: true, companyName: true, type: true } } },
              orderBy: { updatedAt: "desc" },
              take: 12,
            })
          : Promise.resolve([]),
        canViewContacts
          ? prisma.legalContact.findMany({
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
                case: { select: { id: true, title: true, caseNumber: true } },
              },
              orderBy: { updatedAt: "desc" },
              take: 12,
            })
          : Promise.resolve([]),
        canViewPowers
          ? prisma.powerOfAttorney.findMany({
              where: {
                OR: [
                  { number: textFilter },
                  { title: textFilter },
                  { issuer: textFilter },
                  { representative: textFilter },
                  { scope: textFilter },
                ],
              },
              include: { client: { select: { name: true, companyName: true, type: true } } },
              orderBy: { updatedAt: "desc" },
              take: 12,
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], []];

  const total = clients.length + cases.length + contacts.length + powers.length;
  const highRisk = contacts.filter((item) => ["OPPONENT", "CLIENT_REPRESENTATIVE"].includes(item.type)).length + cases.length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="فحص التعارض"
        subtitle="ابحث داخلياً في العملاء والقضايا والخصوم وجهات الاتصال والتوكيلات قبل قبول عميل أو قضية جديدة."
      />

      <form className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.025]">
        <div className="relative min-w-[260px] flex-1">
          <IconSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            className="field pr-9"
            placeholder="اسم عميل، خصم، شركة، هوية، رقم موحد، هاتف، بريد..."
          />
        </div>
        <button className="btn-primary" type="submit">
          فحص
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="نتائج مطابقة" value={total} icon={<IconSearch />} />
        <StatCard label="عملاء" value={clients.length} icon={<IconUsers />} />
        <StatCard label="قضايا" value={cases.length} icon={<IconFolder />} />
        <StatCard label="مؤشرات تعارض" value={highRisk} icon={<IconShield />} />
      </div>

      {!query ? (
        <EmptyState icon={<IconShield />} title="اكتب اسم أو رقم للفحص قبل فتح الملف" />
      ) : total === 0 ? (
        <EmptyState icon={<IconShield />} title="لا توجد مطابقات داخلية" hint="يمكنك المتابعة مع الاستمرار في مراجعة البيانات يدوياً." />
      ) : (
        <div className="grid gap-7 xl:grid-cols-2">
          <ResultPanel title="العملاء" count={clients.length}>
            {clients.map((client) => (
              <ResultItem
                key={client.id}
                title={displayClient(client)}
                meta={client.type === "COMPANY" ? "منشأة" : "فرد"}
                body={[client.name, client.phone, client.email, client.nationalId, client.unifiedNumber].filter(Boolean).join(" - ")}
                badge="عميل"
                badgeClass="bg-brand-50 text-brand-800"
              />
            ))}
          </ResultPanel>

          <ResultPanel title="القضايا" count={cases.length}>
            {cases.map((item) => (
              <ResultItem
                key={item.id}
                title={item.title}
                href={`/cases/${item.id}`}
                meta={`${item.caseNumber} - ${displayClient(item.client)}`}
                body={item.description ?? undefined}
                badge={CASE_STATUS_LABELS[item.status]}
                badgeClass="bg-brass-50 text-brass-800"
              />
            ))}
          </ResultPanel>

          <ResultPanel title="جهات الاتصال والخصوم" count={contacts.length}>
            {contacts.map((item) => (
              <ResultItem
                key={item.id}
                title={item.name}
                href={item.case ? `/cases/${item.case.id}` : undefined}
                meta={[CONTACT_TYPE_LABELS[item.type], item.organization, item.roleTitle].filter(Boolean).join(" - ")}
                body={[
                  item.phone,
                  item.email,
                  item.case ? `${item.case.caseNumber} - ${item.case.title}` : null,
                  item.client ? displayClient(item.client) : null,
                ].filter(Boolean).join(" - ")}
                badge={["OPPONENT", "CLIENT_REPRESENTATIVE"].includes(item.type) ? "راجع التعارض" : "مطابقة"}
                badgeClass={["OPPONENT", "CLIENT_REPRESENTATIVE"].includes(item.type) ? "bg-seal-50 text-seal-700" : "bg-gray-100 text-gray-700"}
              />
            ))}
          </ResultPanel>

          <ResultPanel title="التوكيلات" count={powers.length}>
            {powers.map((item) => (
              <ResultItem
                key={item.id}
                title={item.title}
                meta={`${item.number} - ${displayClient(item.client)}`}
                body={[item.issuer, item.representative, item.expiresAt ? `ينتهي ${formatDate(item.expiresAt)}` : null].filter(Boolean).join(" - ")}
                badge={POWER_STATUS_LABELS[item.status]}
                badgeClass="bg-brand-50 text-brand-800"
              />
            ))}
          </ResultPanel>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="data-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <h2 className="section-title">{title}</h2>
        <Badge className="bg-gray-100 text-gray-700">{count}</Badge>
      </div>
      <div className="divide-y divide-gray-100">
        {count === 0 ? <p className="p-5 text-sm text-gray-500">لا توجد نتائج.</p> : children}
      </div>
    </section>
  );
}

function ResultItem({
  title,
  meta,
  body,
  badge,
  badgeClass,
  href,
}: {
  title: string;
  meta: string;
  body?: string;
  badge: string;
  badgeClass: string;
  href?: string;
}) {
  const content = (
    <div className="flex flex-wrap items-start justify-between gap-3 p-4 transition hover:bg-gray-50">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs text-gray-500">{meta}</p>
        {body && <p className="mt-2 line-clamp-2 text-sm leading-7 text-gray-600">{body}</p>}
      </div>
      <Badge className={badgeClass}>{badge}</Badge>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
