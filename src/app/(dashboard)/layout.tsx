import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";
import { Sidebar, type NavItem } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // نبني عناصر القائمة حسب صلاحيات المستخدم.
  const items: NavItem[] = [
    { href: "/dashboard", label: "الرئيسية", icon: "🏠" },
  ];
  if (hasPermission(user.role, "cases.view"))
    items.push({ href: "/cases", label: "القضايا", icon: "📁" });
  if (hasPermission(user.role, "clients.view"))
    items.push({ href: "/clients", label: "الموكّلون", icon: "👥" });
  if (hasPermission(user.role, "tasks.view"))
    items.push({ href: "/tasks", label: "المهام", icon: "✅" });
  if (hasPermission(user.role, "events.view"))
    items.push({ href: "/calendar", label: "التقويم", icon: "📅" });
  if (hasPermission(user.role, "users.manage"))
    items.push({ href: "/admin/users", label: "الموظفون", icon: "🔐" });
  if (hasPermission(user.role, "audit.view"))
    items.push({ href: "/admin/audit", label: "سجل التدقيق", icon: "📜" });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        items={items}
        userName={user.name}
        roleLabel={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
