import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { UsersManager } from "./users-manager";

export const metadata = { title: "الموظفون — نظام مكتب المحاماة" };

export default async function UsersPage() {
  const admin = await requirePermission("users.manage");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      permissionOverridesJson: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="إدارة الموظفين"
        subtitle="إنشاء حسابات الدخول وتحديد الصلاحيات لكل موظف"
      />
      <UsersManager
        users={users.map((u) => ({
          ...u,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={admin.id}
      />
    </div>
  );
}
