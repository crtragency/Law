import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, EmptyState, StatCard } from "@/components/ui";
import { IconCalendar, IconCheck, IconClock, IconGavel, IconTrash } from "@/components/icons";
import { formatDateTime } from "@/lib/labels";
import { HearingMinuteForm } from "./hearing-minute-form";
import { deleteHearingMinuteFormAction } from "./actions";

export const metadata = { title: "محاضر الجلسات — نظام مكتب المحاماة" };

export default async function HearingsPage() {
  const user = await requirePermission("litigation.view");
  const canManage = hasPermission(user, "litigation.manage");
  const now = new Date();
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [minutes, cases, steps, users, todayCount, upcomingCount] = await Promise.all([
    prisma.hearingMinute.findMany({
      orderBy: { sessionDate: "desc" },
      include: {
        case: { select: { id: true, title: true, caseNumber: true, client: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
      take: 120,
    }),
    prisma.case.findMany({
      where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
      take: 250,
    }),
    prisma.litigationStep.findMany({
      where: { status: { notIn: ["DONE", "CANCELLED"] } },
      orderBy: [{ sessionDate: "asc" }, { dueDate: "asc" }],
      include: { case: { select: { id: true, caseNumber: true } } },
      take: 250,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.hearingMinute.count({
      where: {
        sessionDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    }),
    prisma.hearingMinute.count({
      where: { nextSessionAt: { gte: now, lte: weekEnd } },
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="محاضر الجلسات"
        subtitle="تسجيل سريع لقرار الجلسة والمطلوبات، مع إنشاء تلقائي لموعد الجلسة القادمة ومهمة المتابعة."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="كل المحاضر" value={minutes.length} icon={<IconGavel />} />
        <StatCard label="محاضر اليوم" value={todayCount} icon={<IconCalendar />} />
        <StatCard label="جلسات قادمة خلال أسبوع" value={upcomingCount} icon={<IconClock />} />
        <StatCard label="قضايا متاحة" value={cases.length} icon={<IconCheck />} />
      </div>

      <div className="workspace-grid">
        {canManage && (
          <HearingMinuteForm
            cases={cases}
            steps={steps.map((step) => ({
              id: step.id,
              title: step.title,
              caseId: step.case.id,
              caseNumber: step.case.caseNumber,
            }))}
            users={users}
          />
        )}

        <div className={canManage ? "" : "lg:col-span-2"}>
          {minutes.length === 0 ? (
            <EmptyState icon={<IconGavel />} title="لا توجد محاضر جلسات بعد" />
          ) : (
            <div className="data-panel divide-y divide-gray-100">
              {minutes.map((minute) => (
                <article key={minute.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/cases/${minute.case.id}`} className="font-display text-lg font-bold text-ink hover:underline">
                        {minute.case.caseNumber} - {minute.case.title}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {minute.case.client.name} - {minute.createdBy?.name ?? "النظام"} - {formatDateTime(minute.sessionDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {minute.nextSessionAt && (
                        <Badge className="bg-brass-50 text-brass-800">
                          القادمة: {formatDateTime(minute.nextSessionAt)}
                        </Badge>
                      )}
                      {canManage && (
                        <form action={deleteHearingMinuteFormAction}>
                          <input type="hidden" name="id" value={minute.id} />
                          <button className="rounded-lg p-2 text-seal-600 hover:bg-seal-50" type="submit" aria-label="حذف">
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{minute.decision}</p>
                  {minute.requirements && (
                    <p className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-3 text-sm leading-7 text-brand-900">
                      {minute.requirements}
                    </p>
                  )}
                  {(minute.court || minute.circuit || minute.notes) && (
                    <p className="mt-3 text-xs leading-6 text-gray-500">
                      {[minute.court, minute.circuit, minute.notes].filter(Boolean).join(" - ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
