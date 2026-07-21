import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/labels";
import { IconBell } from "@/components/icons";
import { markAllReadAction } from "./actions";

export const metadata = { title: "الإشعارات — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

type AlertTone = "brand" | "warning" | "danger";

export default async function NotificationsPage() {
  const me = await requireUser();
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);

  const canFinance = hasPermission(me.role, "finance.view");
  const canDocuments = hasPermission(me.role, "documents.view");
  const canApprovals = hasPermission(me.role, "approvals.view");
  const canManageApprovals = hasPermission(me.role, "approvals.manage");

  const [
    notifications,
    dueTasks,
    upcomingEvents,
    dueInvoices,
    expiringDocuments,
    pendingApprovals,
  ] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.task.findMany({
      where: {
        assignedToId: me.id,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lte: soon },
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.event.findMany({
      where: {
        startAt: { gte: now, lte: soon },
        OR: [{ createdById: me.id }, { case: { assignedLawyerId: me.id } }],
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: { startAt: "asc" },
      take: 8,
    }),
    canFinance
      ? prisma.invoice.findMany({
          where: {
            status: { notIn: ["PAID", "CANCELLED"] },
            dueDate: { lte: soon },
          },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { dueDate: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    canDocuments
      ? prisma.document.findMany({
          where: { expiresAt: { lte: soon } },
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
          orderBy: { expiresAt: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    canApprovals
      ? prisma.approvalRequest.findMany({
          where: canManageApprovals ? { status: "PENDING" } : { status: "PENDING", requestedById: me.id },
          include: { requestedBy: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const hasUnread = notifications.some((n) => !n.read);

  const taskAlerts = dueTasks.map((task) => ({
    title: task.title,
    subtitle: `${task.case?.caseNumber ?? "بدون قضية"} — ${task.dueDate ? formatDate(task.dueDate) : "بدون موعد"}`,
    href: task.caseId ? `/cases/${task.caseId}` : "/tasks",
    tone: task.dueDate && task.dueDate < now ? "danger" as const : "warning" as const,
  }));
  const eventAlerts = upcomingEvents.map((event) => ({
    title: event.title,
    subtitle: `${event.case?.caseNumber ?? "بدون قضية"} — ${formatDateTime(event.startAt)}`,
    href: event.caseId ? `/cases/${event.caseId}` : "/calendar",
    tone: "brand" as const,
  }));
  const invoiceAlerts = dueInvoices.map((invoice) => ({
    title: `فاتورة ${invoice.number}`,
    subtitle: `${invoice.client.type === "COMPANY" && invoice.client.companyName ? invoice.client.companyName : invoice.client.name} — ${invoice.dueDate ? formatDate(invoice.dueDate) : "بدون استحقاق"}`,
    href: "/finance",
    tone: invoice.dueDate && invoice.dueDate < now ? "danger" as const : "warning" as const,
  }));
  const documentAlerts = expiringDocuments.map((document) => ({
    title: document.title,
    subtitle: `${document.case.caseNumber} — ${document.expiresAt ? formatDate(document.expiresAt) : "بدون تاريخ"}`,
    href: `/cases/${document.caseId}`,
    tone: document.expiresAt && document.expiresAt < now ? "danger" as const : "warning" as const,
  }));
  const approvalAlerts = pendingApprovals.map((approval) => ({
    title: approval.title,
    subtitle: `${approval.requestedBy?.name ?? "—"} — ${formatDateTime(approval.createdAt)}`,
    href: "/approvals",
    tone: "warning" as const,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإشعارات"
        subtitle="المواعيد والمهام والموافقات والتنبيهات المهمة في مكان واحد"
        action={
          hasUnread ? (
            <form action={markAllReadAction}>
              <button type="submit" className="btn-secondary">
                تعليم الكل كمقروء
              </button>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AlertPanel title="المهام المستحقة" empty="لا توجد مهام مستحقة" items={taskAlerts} />
        <AlertPanel title="المواعيد القادمة" empty="لا توجد مواعيد خلال 7 أيام" items={eventAlerts} />
        <AlertPanel title="الفواتير المستحقة" empty="لا توجد فواتير مستحقة" items={invoiceAlerts} />
        <AlertPanel title="المستندات المنتهية" empty="لا توجد مستندات قريبة الانتهاء" items={documentAlerts} />
        <AlertPanel title="الموافقات المعلقة" empty="لا توجد موافقات معلقة" items={approvalAlerts} />
      </div>

      {notifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center text-gray-500">
          <IconBell className="mb-3 h-8 w-8 text-gray-300" />
          لا توجد إشعارات بعد
        </div>
      ) : (
        <div className="data-panel divide-y divide-gray-100">
          {notifications.map((n) => {
            const inner = (
              <div className={`flex items-start gap-3 p-4 ${n.read ? "" : "bg-brand-50/50"}`}>
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.read ? "bg-gray-100 text-gray-400" : "bg-brand-100 text-brand-600"}`}>
                  <IconBell className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-gray-50">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AlertPanel({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { title: string; subtitle: string; href: string; tone: AlertTone }[];
}) {
  return (
    <section className="data-panel">
      <div className="border-b border-line p-4">
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">{empty}</p>
        ) : items.map((item, index) => (
          <Link key={`${item.href}-${index}`} href={item.href} className="block p-4 transition hover:bg-gray-50">
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${toneClass(item.tone)}`} />
              <div>
                <p className="font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-gray-500">{item.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function toneClass(tone: AlertTone) {
  if (tone === "danger") return "bg-seal-600";
  if (tone === "warning") return "bg-brass-600";
  return "bg-brand-600";
}
