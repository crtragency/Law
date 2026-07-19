import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_TYPE_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { IconFolder, IconCalendar } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const client = await requirePortalClient();

  const [cases, nextEvent] = await Promise.all([
    prisma.case.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignedLawyer: { select: { name: true } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.event.findFirst({
      where: { case: { clientId: client.id }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      include: { case: { select: { title: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">قضاياك</h1>
        <p className="mt-1 text-sm text-gray-500">
          متابعة حالة قضاياك ومستنداتك ومواعيد الجلسات
        </p>
        <div className="rule-double mt-4" aria-hidden />
      </div>

      {nextEvent && (
        <div className="card flex items-start gap-3 border-brand-200 bg-brand-50/40">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-brand-100 text-brand-700">
            <IconCalendar className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-brand-900">أقرب موعد قادم</p>
            <p className="mt-0.5 text-sm text-gray-700">
              {nextEvent.title}
              {nextEvent.case && ` — ${nextEvent.case.title}`}
            </p>
            <p className="text-xs text-gray-500">{formatDateTime(nextEvent.startAt)}</p>
          </div>
        </div>
      )}

      {cases.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center text-gray-500">
          <IconFolder className="mb-3 h-8 w-8 text-gray-300" />
          لا توجد قضايا مسجّلة حالياً
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/portal/cases/${c.id}`}
              className="card transition hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display font-bold text-ink">{c.title}</h2>
                <Badge className={CASE_STATUS_COLORS[c.status]}>
                  {CASE_STATUS_LABELS[c.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500" dir="ltr">
                {c.caseNumber}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>{CASE_TYPE_LABELS[c.caseType]}</span>
                {c.court && <span>{c.court}</span>}
                {c.assignedLawyer && <span>المحامي: {c.assignedLawyer.name}</span>}
                <span>{c._count.documents} مستند</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
