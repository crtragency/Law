import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { IconBell, IconMessage } from "@/components/icons";

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
  if (hasPermission(user.role, "cases.view"))
    items.push({ href: "/cases", label: "القضايا", icon: "folder" });
  if (hasPermission(user.role, "clients.view"))
    items.push({ href: "/clients", label: "الموكّلون", icon: "users" });
  if (hasPermission(user.role, "tasks.view"))
    items.push({ href: "/tasks", label: "المهام", icon: "check" });
  if (hasPermission(user.role, "events.view"))
    items.push({ href: "/calendar", label: "التقويم", icon: "calendar" });
  items.push({ href: "/messages", label: "الرسائل", icon: "message" });
  if (hasPermission(user.role, "users.manage"))
    items.push({ href: "/admin/users", label: "الموظفون", icon: "shield" });
  if (hasPermission(user.role, "audit.view"))
    items.push({ href: "/admin/audit", label: "سجل التدقيق", icon: "file" });

  // عدّادات غير المقروء للإشعارات والرسائل.
  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.message.count({ where: { recipientId: user.id, read: false } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        items={items}
        userName={user.name}
        roleLabel={ROLE_LABELS[user.role]}
      />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur sm:px-6 lg:px-8">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
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
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-gray-500 transition hover:border-brand-300 hover:text-brand-700"
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
