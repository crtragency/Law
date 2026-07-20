import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { IconBell, IconMessage, IconSearch } from "@/components/icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // نبني عناصر القائمة حسب صلاحيات المستخدم.
  const items: NavItem[] = [
    { href: "/dashboard", label: "الرئيسية", icon: "home" },
  ];
  if (hasPermission(user.role, "services.view"))
    items.push({ href: "/services", label: "الخدمات والوحدات", icon: "scale" });
  if (hasPermission(user.role, "cases.view"))
    items.push({ href: "/cases", label: "القضايا", icon: "folder" });
  if (hasPermission(user.role, "litigation.view"))
    items.push({ href: "/litigation", label: "التقاضي", icon: "gavel" });
  if (hasPermission(user.role, "clients.view"))
    items.push({ href: "/clients", label: "الموكّلون", icon: "users" });
  if (hasPermission(user.role, "contacts.view"))
    items.push({ href: "/contacts", label: "جهات الاتصال", icon: "users" });
  if (hasPermission(user.role, "powers.view"))
    items.push({ href: "/powers", label: "التوكيلات", icon: "shield" });
  if (hasPermission(user.role, "tasks.view"))
    items.push({ href: "/tasks", label: "المهام", icon: "check" });
  if (hasPermission(user.role, "events.view"))
    items.push({ href: "/calendar", label: "التقويم", icon: "calendar" });
  if (hasPermission(user.role, "contracts.view"))
    items.push({ href: "/contracts", label: "اتفاقيات الأتعاب", icon: "file" });
  if (hasPermission(user.role, "finance.view"))
    items.push({ href: "/finance", label: "المالية", icon: "building" });
  if (hasPermission(user.role, "templates.view"))
    items.push({ href: "/templates", label: "النماذج القانونية", icon: "pen" });
  if (hasPermission(user.role, "reminders.view"))
    items.push({ href: "/reminders", label: "التنبيهات", icon: "bell" });
  if (hasPermission(user.role, "reports.view"))
    items.push({ href: "/reports", label: "التقارير", icon: "file" });
  if (hasPermission(user.role, "search.view"))
    items.push({ href: "/search", label: "البحث العام", icon: "search" });
  items.push({ href: "/messages", label: "الرسائل", icon: "message" });
  if (hasPermission(user.role, "users.manage"))
    items.push({ href: "/admin/users", label: "الموظفون", icon: "shield" });
  if (hasPermission(user.role, "firm.manage"))
    items.push({ href: "/admin/firm", label: "بيانات الشركة", icon: "building" });
  if (hasPermission(user.role, "audit.view"))
    items.push({ href: "/admin/audit", label: "سجل التدقيق", icon: "file" });

  // عدّادات غير المقروء للإشعارات والرسائل.
  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.message.count({ where: { recipientId: user.id, read: false } }),
  ]);

  return (
    <div className="dashboard-shell flex min-h-screen flex-col bg-paper lg:flex-row">
      <Sidebar
        items={items}
        userName={user.name}
        roleLabel={ROLE_LABELS[user.role]}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-line/80 bg-paper/90 px-4 py-3 shadow-sm shadow-black/[0.02] backdrop-blur-xl sm:px-6 lg:px-8">
          {hasPermission(user.role, "search.view") && (
            <HeaderButton href="/search" count={0} label="البحث العام">
              <IconSearch />
            </HeaderButton>
          )}
          <HeaderButton
            href="/messages"
            count={unreadMessages}
            label="الرسائل"
          >
            <IconMessage />
          </HeaderButton>
          <HeaderButton
            href="/notifications"
            count={unreadNotifications}
            label="الإشعارات"
          >
            <IconBell />
          </HeaderButton>
        </header>
        <main className="dashboard-main flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function HeaderButton({
  href,
  count,
  label,
  children,
}: {
  href: string;
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/95 text-gray-500 shadow-sm shadow-black/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-brand-700"
    >
      {children}
      {count > 0 && (
        <span className="absolute -top-1.5 -left-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-seal-600 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
