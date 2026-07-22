import Link from "next/link";
import type { CSSProperties } from "react";
import { requireUser } from "@/lib/auth";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Badge, FlashMessage } from "@/components/ui";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDateTime,
} from "@/lib/labels";
import {
  IconBell,
  IconCalendar,
  IconCheck,
  IconFileText,
  IconFolder,
  IconPaperclip,
  IconScale,
  IconUsers,
} from "@/components/icons";

export const dynamic = "force-dynamic";

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric" }).format(date);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const now = new Date();
  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [
    caseCount,
    openCaseCount,
    clientCount,
    myTaskCount,
    taskCount,
    doneTaskCount,
    doneThisWeekCount,
    openServiceRequestCount,
    documentCount,
    indexedDocumentCount,
    upcomingReminderCount,
    userCount,
    upcomingEvents,
    recentCases,
    myTasks,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "POSTPONED"] } } }),
    prisma.client.count(),
    prisma.task.count({ where: { assignedToId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "DONE" } }),
    prisma.task.count({ where: { status: "DONE", updatedAt: { gte: weekStart } } }),
    prisma.serviceRequest.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.document.count(),
    prisma.document.count({ where: { ocrStatus: "INDEXED" } }),
    prisma.reminder.count({ where: { status: "OPEN", dueAt: { gte: now, lte: soon } } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.event.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { case: { select: { caseNumber: true, title: true } } },
    }),
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { client: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { assignedToId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 5,
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
    }),
  ]);

  const taskProgress = percent(doneTaskCount, taskCount);
  const documentProgress = percent(indexedDocumentCount, documentCount);
  const initials = user.name.trim().slice(0, 1) || "؟";
  const weekDays = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return date;
  });

  return (
    <div className="space-y-6">
      <FlashMessage error={error} />

      <section className="law-command-board">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <Link href="/dashboard" className="law-pill-active">الرئيسية</Link>
            <Link href="/cases" className="law-pill">القضايا</Link>
            <Link href="/tasks" className="law-pill">المهام</Link>
            <Link href="/documents" className="law-pill">الملفات</Link>
            <Link href="/calendar" className="law-pill">التقويم</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="law-icon-pill">
              {user.avatarStorageKey ? (
                <img src={`/api/users/${user.id}/avatar`} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </div>
        </div>

        <div className="mb-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h1 className="font-display text-[34px] font-bold leading-tight text-ink sm:text-[42px]">
              أهلا، {user.name}
            </h1>
            <p className="mt-2 text-sm leading-7 text-gray-500">
              لوحة تشغيل يومية تجمع القضايا والمهام والمواعيد والملفات في مساحة واحدة.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-5 text-center">
            <TopMetric label="مستخدم" value={userCount} icon={<IconUsers />} />
            <TopMetric label="قضية" value={caseCount} icon={<IconScale />} />
            <TopMetric label="ملف" value={documentCount} icon={<IconPaperclip />} />
          </div>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1fr]">
          <ProgressChip label="قضايا نشطة" value={openCaseCount} hint={`${caseCount} إجمالي`} />
          <ProgressChip label="مهامي المفتوحة" value={myTaskCount} hint={`${doneThisWeekCount} انتهت هذا الأسبوع`} tone="dark" />
          <ProgressChip label="خدمات مفتوحة" value={openServiceRequestCount} hint="تشغيل وخدمات" tone="bright" />
          <ProgressChip label="تنبيهات قريبة" value={upcomingReminderCount} hint="خلال 14 يوم" tone="muted" />
        </div>

        <div className="law-dashboard-grid">
          <section className="profile-card-panel">
            <div className="profile-card-image">
              {user.avatarStorageKey ? (
                <img src={`/api/users/${user.id}/avatar`} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-brass-300 text-6xl font-bold text-brand-950">
                  {initials}
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/85 to-transparent p-5 text-white">
              <h2 className="font-display text-xl font-bold">{user.name}</h2>
              <p className="mt-1 text-sm text-brand-100">{user.profileTitle || ROLE_LABELS[user.role]}</p>
              <Link href="/profile" className="mt-3 inline-flex rounded-lg border border-white/25 px-3 py-1 text-xs font-bold text-white">
                تعديل البروفايل
              </Link>
            </div>
          </section>

          <section className="law-mini-card">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">تقدم المهام</h2>
                <p className="mt-1 text-xs text-gray-500">إنجاز المكتب الكلي</p>
              </div>
              <Link href="/tasks" className="law-card-arrow">↗</Link>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-display text-4xl font-bold text-ink">{taskProgress}%</div>
                <p className="mt-1 text-xs text-gray-500">{doneTaskCount} من {taskCount} مهمة</p>
              </div>
              <div className="flex h-28 flex-1 items-end justify-end gap-3">
                {[42, 68, 54, 78, taskProgress || 18].map((height, index) => (
                  <span key={index} className="law-bar" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </section>

          <section className="law-mini-card">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">فهرسة الملفات</h2>
                <p className="mt-1 text-xs text-gray-500">جاهزية البحث داخل المستندات</p>
              </div>
              <Link href="/documents" className="law-card-arrow">↗</Link>
            </div>
            <div className="grid place-items-center">
              <div className="law-ring" style={{ "--progress": `${documentProgress}%` } as CSSProperties}>
                <div>
                  <span className="block font-display text-3xl font-bold">{documentProgress}%</span>
                  <span className="text-xs text-gray-500">مفهرس</span>
                </div>
              </div>
            </div>
          </section>

          <section className="law-task-panel">
            <div className="mb-4 flex items-start justify-between text-white">
              <div>
                <h2 className="font-display text-xl font-bold">مهام اليوم</h2>
                <p className="mt-1 text-xs text-brand-100">المفتوح عليك الآن</p>
              </div>
              <div className="font-display text-3xl font-bold">{myTasks.length}/5</div>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              {myTasks.length === 0 ? (
                <p className="grid flex-1 place-items-center rounded-lg border border-white/10 bg-white/[0.08] p-6 text-center text-sm font-semibold leading-7 text-brand-100">لا توجد مهام مفتوحة لك حاليا.</p>
              ) : (
                myTasks.map((task) => (
                  <Link key={task.id} href="/tasks" className="law-task-row">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-brand-100">
                      <IconCheck className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{task.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-brand-100">
                        {task.case ? `${task.case.caseNumber} - ${task.case.title}` : TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </span>
                    <Badge className={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="law-stack-panel">
            <StackItem title="طلبات المستندات" href="/document-requests" count={documentCount} />
            <StackItem title="التنبيهات القادمة" href="/reminders" count={upcomingReminderCount} />
            <StackItem title="الرسائل الداخلية" href="/messages" count={0} />
          </section>

          <section className="calendar-card-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">تقويم المكتب</h2>
              <Link href="/calendar" className="law-card-arrow">↗</Link>
            </div>
            <div className="mb-4 grid grid-cols-6 gap-2 text-center">
              {weekDays.map((date) => (
                <div key={date.toISOString()} className="rounded-lg border border-line bg-white/70 p-2">
                  <span className="block text-[11px] font-bold text-gray-500">{dayLabel(date)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="rounded-lg border border-line bg-white p-4 text-sm text-gray-500">لا توجد مواعيد قادمة</p>
              ) : (
                upcomingEvents.map((event) => (
                  <Link key={event.id} href="/calendar" className="law-event-row">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <IconCalendar className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{event.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {formatDateTime(event.startAt)}
                        {event.case ? ` - ${event.case.caseNumber}` : ""}
                      </span>
                    </span>
                    <Badge className="bg-brand-50 text-brand-800">{EVENT_TYPE_LABELS[event.type]}</Badge>
                  </Link>
                ))
              )}
            </div>
          </section>

          {hasPermission(user, "cases.view") && (
            <section className="recent-cases-panel">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-ink">أحدث القضايا</h2>
                <Link href="/cases" className="law-card-arrow">↗</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {recentCases.map((item) => (
                  <Link key={item.id} href={`/cases/${item.id}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{item.caseNumber} - {item.client.name}</span>
                    </span>
                    <Badge className={CASE_STATUS_COLORS[item.status]}>{CASE_STATUS_LABELS[item.status]}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function TopMetric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="min-w-20">
      <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">{icon}</div>
      <div className="font-display text-3xl font-bold text-ink">{value}</div>
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
    </div>
  );
}

function ProgressChip({
  label,
  value,
  hint,
  tone = "brand",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "brand" | "dark" | "bright" | "muted";
}) {
  const toneClass =
    tone === "dark"
      ? "bg-brand-900 text-white"
      : tone === "bright"
        ? "bg-brand-600 text-white"
        : tone === "muted"
          ? "bg-white text-ink"
          : "bg-brand-700 text-white";
  return (
    <div className={`rounded-lg px-4 py-3 shadow-sm shadow-black/[0.035] ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold opacity-80">{label}</span>
        <span className="font-display text-2xl font-bold">{value}</span>
      </div>
      <div className="mt-1 text-[11px] opacity-70">{hint}</div>
    </div>
  );
}

function StackItem({ title, href, count }: { title: string; href: string; count: number }) {
  return (
    <Link href={href} className="flex items-center justify-between border-b border-line/80 px-4 py-4 last:border-b-0">
      <span className="font-semibold text-ink">{title}</span>
      <span className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{count}</span>
    </Link>
  );
}
