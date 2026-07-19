import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalClient } from "@/lib/portal-session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { IconCalendar, IconFileText } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PortalCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const client = await requirePortalClient();
  const { id } = await params;

  // العميل يرى قضاياه فقط.
  const c = await prisma.case.findFirst({
    where: { id, clientId: client.id },
    include: {
      assignedLawyer: { select: { name: true } },
      documents: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { startAt: "asc" } },
    },
  });

  if (!c) notFound();

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm font-medium text-brand-700 hover:underline">
          رجوع إلى قضاياك
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{c.title}</h1>
            <p className="mt-1 text-sm text-gray-500" dir="ltr">
              {c.caseNumber}
            </p>
          </div>
          <Badge className={CASE_STATUS_COLORS[c.status]}>
            {CASE_STATUS_LABELS[c.status]}
          </Badge>
        </div>
        <div className="rule-double mt-4" aria-hidden />
      </div>

      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="نوع القضية" value={CASE_TYPE_LABELS[c.caseType]} />
        <Info label="المحكمة" value={c.court ?? "—"} />
        <Info label="المحامي المسؤول" value={c.assignedLawyer?.name ?? "—"} />
        <Info label="تاريخ الفتح" value={formatDate(c.openedAt)} />
      </div>

      {/* المواعيد والجلسات */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
          <IconCalendar className="h-5 w-5 text-brand-600" /> المواعيد والجلسات
        </h2>
        <div className="card divide-y divide-gray-100 p-0">
          {c.events.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">لا توجد مواعيد مسجّلة</p>
          ) : (
            c.events.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{ev.title}</span>
                    <Badge className={EVENT_TYPE_COLORS[ev.type]}>
                      {EVENT_TYPE_LABELS[ev.type]}
                    </Badge>
                  </div>
                  {ev.location && (
                    <p className="mt-0.5 text-xs text-gray-500">{ev.location}</p>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-700">{formatDateTime(ev.startAt)}</p>
                  {ev.startAt >= now && (
                    <span className="text-[11px] font-medium text-brand-700">قادم</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* المستندات */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
          <IconFileText className="h-5 w-5 text-brand-600" /> المستندات
        </h2>
        <div className="card divide-y divide-gray-100 p-0">
          {c.documents.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">لا توجد مستندات متاحة</p>
          ) : (
            c.documents.map((d) => {
              const isExternal = /^https?:\/\//i.test(d.storageKey);
              const href = isExternal
                ? d.storageKey
                : `/api/portal/documents/${d.id}`;
              return (
                <a
                  key={d.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 text-brand-700 hover:bg-gray-50"
                >
                  <IconFileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="font-medium">{d.title}</span>
                  <span className="mr-auto text-xs text-gray-400">
                    {formatDate(d.createdAt)}
                  </span>
                </a>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}
