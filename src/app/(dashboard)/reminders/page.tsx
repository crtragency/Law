import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge } from "@/components/ui";
import {
  REMINDER_STATUS_COLORS,
  REMINDER_STATUS_LABELS,
  REMINDER_TYPE_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { completeReminderAction, saveReminderFormAction } from "./actions";
import { IconCheck, IconPlus } from "@/components/icons";

export const metadata = { title: "التنبيهات الذكية — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

const TYPES = Object.keys(REMINDER_TYPE_LABELS);

export default async function RemindersPage() {
  const user = await requirePermission("reminders.view");
  const canManage = hasPermission(user, "reminders.manage");
  const now = new Date();
  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [reminders, powers, invoices, tasks, serviceRequests, users, clients, cases] = await Promise.all([
    prisma.reminder.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { dueAt: "asc" },
      include: { user: { select: { name: true } }, client: true, case: { select: { title: true, caseNumber: true } } },
      take: 100,
    }),
    prisma.powerOfAttorney.findMany({
      where: { expiresAt: { gte: now, lte: soon }, status: { in: ["ACTIVE", "EXPIRING"] } },
      include: { client: true },
      orderBy: { expiresAt: "asc" },
      take: 20,
    }),
    prisma.invoice.findMany({
      where: { dueDate: { gte: now, lte: soon }, status: { notIn: ["PAID", "CANCELLED"] } },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: now, lte: soon }, status: { in: ["TODO", "IN_PROGRESS"] } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.serviceRequest.findMany({
      where: { dueDate: { gte: now, lte: soon }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, companyName: true, type: true } }),
    prisma.case.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, caseNumber: true }, take: 200 }),
  ]);

  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: client.type === "COMPANY" && client.companyName ? client.companyName : client.name,
  }));

  const suggested = [
    ...powers.map((p) => ({
      title: `انتهاء وكالة: ${p.title}`,
      dueAt: p.expiresAt,
      link: "/powers",
      type: "انتهاء وكالة",
    })),
    ...invoices.map((i) => ({
      title: `استحقاق فاتورة: ${i.number}`,
      dueAt: i.dueDate,
      link: "/finance",
      type: "استحقاق فاتورة",
    })),
    ...tasks.map((t) => ({
      title: `مهمة مستحقة: ${t.title}`,
      dueAt: t.dueDate,
      link: "/tasks",
      type: "مهمة",
    })),
    ...serviceRequests.map((s) => ({
      title: `طلب خدمة مستحق: ${s.title}`,
      dueAt: s.dueDate,
      link: "/services",
      type: "طلب خدمة",
    })),
  ].sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title="التنبيهات الذكية" subtitle="مواعيد حرجة، انتهاء وكالات، استحقاقات مالية، ومهام قادمة" />

      {canManage && (
        <form action={saveReminderFormAction} className="form-panel grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-4">
            <h2 className="form-title">تنبيه جديد</h2>
            <p className="form-subtitle">موعد مهم، استحقاق مالي، انتهاء توكيل، أو متابعة داخلية.</p>
          </div>
          <input name="title" required className="field lg:col-span-2" placeholder="عنوان التنبيه" />
          <select name="type" className="field" defaultValue="CUSTOM">
            {TYPES.map((type) => <option key={type} value={type}>{REMINDER_TYPE_LABELS[type]}</option>)}
          </select>
          <input name="dueAt" required type="datetime-local" className="field" />
          <select name="userId" className="field" defaultValue="">
            <option value="">بدون مسؤول</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select name="clientId" className="field" defaultValue="">
            <option value="">بدون موكّل</option>
            {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="caseId" className="field" defaultValue="">
            <option value="">بدون قضية</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}
          </select>
          <input name="link" className="field" placeholder="/cases أو رابط داخلي" />
          <textarea name="notes" rows={2} className="field lg:col-span-3" placeholder="ملاحظات" />
          <button type="submit" className="btn-primary"><IconPlus className="h-4 w-4" /> إضافة تنبيه</button>
        </form>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">التنبيهات المفتوحة</h2>
          <div className="data-panel divide-y divide-gray-100">
            {reminders.length === 0 ? <p className="p-6 text-sm text-gray-500">لا توجد تنبيهات</p> : reminders.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={REMINDER_STATUS_COLORS[r.status]}>{REMINDER_STATUS_LABELS[r.status]}</Badge>
                    <span className="font-medium text-gray-800">{r.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {REMINDER_TYPE_LABELS[r.type]} — {formatDateTime(r.dueAt)}
                    {r.user && ` — ${r.user.name}`}
                  </p>
                  {r.link && <Link href={r.link} className="mt-1 inline-block text-xs text-brand-700 hover:underline">فتح الرابط</Link>}
                </div>
                {canManage && r.status === "OPEN" && (
                  <form action={completeReminderAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="btn-secondary px-3 py-1.5 text-xs"><IconCheck className="h-3.5 w-3.5" /> تم</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">استحقاقات خلال 14 يوم</h2>
          <div className="data-panel divide-y divide-gray-100">
            {suggested.length === 0 ? <p className="p-6 text-sm text-gray-500">لا توجد استحقاقات قريبة</p> : suggested.map((item, index) => (
              <Link key={`${item.title}-${index}`} href={item.link} className="block p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-800">{item.title}</span>
                  <span className="text-xs text-gray-400">{formatDate(item.dueAt)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{item.type}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
