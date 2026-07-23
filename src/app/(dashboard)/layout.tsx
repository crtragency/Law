import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { SearchCommand } from "@/components/search-command";
import { HeaderMessagesPopover, HeaderNotificationsPopover } from "@/components/header-popovers";
import { AttendancePrompt } from "@/components/attendance-prompt";
import { getCurrentWorkDate } from "@/lib/attendance";
import { formatDateTime } from "@/lib/labels";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const items: NavItem[] = [{ href: "/dashboard", label: "الرئيسية", icon: "home" }];

  if (hasPermission(user, "tasks.view") || hasPermission(user, "events.view"))
    items.push({ href: "/daily-agenda", label: "أجندة اليوم", icon: "calendar" });
  if (hasPermission(user, "services.view"))
    items.push({ href: "/services", label: "الخدمات والوحدات", icon: "scale" });
  if (hasPermission(user, "consultations.view"))
    items.push({ href: "/consultations", label: "الاستشارات", icon: "message" });
  if (hasPermission(user, "cases.view"))
    items.push({ href: "/cases", label: "القضايا", icon: "folder" });
  if (hasPermission(user, "documents.view")) {
    items.push({ href: "/document-requests", label: "طلبات المستندات", icon: "inbox" });
    items.push({ href: "/documents", label: "مركز الملفات", icon: "paperclip" });
  }
  if (hasPermission(user, "cases.view")) {
    items.push({ href: "/communications", label: "سجل الاتصالات", icon: "phone" });
    items.push({ href: "/correspondence", label: "الوارد والصادر", icon: "send" });
    items.push({ href: "/meetings", label: "محاضر الاجتماعات", icon: "message" });
    items.push({ href: "/settlements", label: "التسويات والعروض", icon: "scale" });
  }
  if (hasPermission(user, "litigation.view")) {
    items.push({ href: "/litigation", label: "التقاضي", icon: "gavel" });
    items.push({ href: "/hearings", label: "محاضر الجلسات", icon: "gavel" });
  }
  if (hasPermission(user, "clients.view")) {
    items.push({ href: "/clients", label: "الموكلون", icon: "users" });
    items.push({ href: "/conflict-check", label: "فحص التعارض", icon: "shield" });
  }
  if (hasPermission(user, "contacts.view"))
    items.push({ href: "/contacts", label: "جهات الاتصال", icon: "users" });
  if (hasPermission(user, "powers.view"))
    items.push({ href: "/powers", label: "التوكيلات", icon: "shield" });
  if (hasPermission(user, "tasks.view"))
    items.push({ href: "/tasks", label: "المهام", icon: "check" });
  if (hasPermission(user, "events.view"))
    items.push({ href: "/calendar", label: "التقويم", icon: "calendar" });
  items.push({ href: "/deadlines", label: "حاسبة المدد", icon: "clock" });
  if (hasPermission(user, "contracts.view"))
    items.push({ href: "/contracts", label: "اتفاقيات الأتعاب", icon: "file" });
  if (hasPermission(user, "finance.view"))
    items.push({ href: "/finance", label: "المالية", icon: "building" });
  if (hasPermission(user, "templates.view"))
    items.push({ href: "/templates", label: "النماذج القانونية", icon: "pen" });
  if (hasPermission(user, "library.view"))
    items.push({ href: "/library", label: "المكتبة القانونية", icon: "file" });
  if (hasPermission(user, "approvals.view"))
    items.push({ href: "/approvals", label: "الموافقات", icon: "shield" });
  if (hasPermission(user, "reminders.view"))
    items.push({ href: "/reminders", label: "التنبيهات", icon: "bell" });
  if (hasPermission(user, "reports.view"))
    items.push({ href: "/reports", label: "التقارير", icon: "file" });
  if (hasPermission(user, "attendance.manage"))
    items.push({ href: "/attendance", label: "الحضور والانصراف", icon: "clock" });
  items.push({ href: "/messages", label: "الرسائل", icon: "message" });
  if (hasPermission(user, "users.manage"))
    items.push({ href: "/admin/users", label: "الموظفون", icon: "shield" });
  if (hasPermission(user, "firm.manage"))
    items.push({ href: "/admin/firm", label: "بيانات الشركة", icon: "building" });
  if (hasPermission(user, "audit.view")) {
    items.push({ href: "/admin/audit", label: "سجل التدقيق", icon: "file" });
    items.push({ href: "/admin/email-queue", label: "طابور البريد", icon: "message" });
    items.push({ href: "/admin/production", label: "جاهزية التشغيل", icon: "shield" });
  }
  items.push({ href: "/profile", label: "البروفايل", icon: "user" });

  const todayWorkDate = getCurrentWorkDate();
  const [unreadNotifications, unreadMessages, recentNotifications, recentMessages, todayAttendance] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.message.count({ where: { recipientId: user.id, read: false } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.message.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        body: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    }),
    prisma.attendanceRecord.findUnique({
      where: { userId_workDate: { userId: user.id, workDate: todayWorkDate } },
      select: {
        userId: true,
        workDate: true,
        clockInAt: true,
        clockOutAt: true,
      },
    }),
  ]);
  const canSearch = hasPermission(user, "search.view");
  const notificationItems = recentNotifications.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    read: item.read,
    href: item.link ?? "/notifications",
    createdAtLabel: formatDateTime(item.createdAt),
  }));
  const messageItems = recentMessages.map((item) => ({
    id: item.id,
    senderName: item.sender.name,
    body: item.body,
    read: item.read,
    href: `/messages?to=${item.sender.id}`,
    createdAtLabel: formatDateTime(item.createdAt),
  }));

  return (
    <div className="dashboard-shell flex min-h-screen flex-col bg-paper lg:flex-row">
      <Sidebar
        items={items}
        userId={user.id}
        userName={user.name}
        avatarStorageKey={user.avatarStorageKey}
        roleLabel={ROLE_LABELS[user.role]}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-line/80 bg-white/78 px-4 py-3 shadow-sm shadow-black/[0.025] backdrop-blur-xl sm:px-6 lg:px-8">
          {canSearch && <SearchCommand />}
          <HeaderMessagesPopover count={unreadMessages} items={messageItems} />
          <HeaderNotificationsPopover count={unreadNotifications} items={notificationItems} />
          <ProfileButton
            href="/profile"
            userId={user.id}
            name={user.name}
            avatarStorageKey={user.avatarStorageKey}
          />
        </header>
        <main className="dashboard-main mx-auto w-full max-w-[1720px] flex-1 p-4 sm:p-6 lg:p-9 xl:p-10">
          <AttendancePrompt record={todayAttendance} />
          {children}
        </main>
      </div>
    </div>
  );
}

function ProfileButton({
  href,
  userId,
  name,
  avatarStorageKey,
}: {
  href: string;
  userId: string;
  name: string;
  avatarStorageKey: string | null;
}) {
  const initials = name.trim().slice(0, 1) || "؟";
  return (
    <Link
      href={href}
      aria-label="البروفايل"
      className="relative flex h-9 w-9 overflow-hidden rounded-lg border border-line bg-white/95 text-sm font-bold text-brand-800 shadow-sm shadow-black/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white"
    >
      {avatarStorageKey ? (
        <img src={`/api/users/${userId}/avatar`} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center">{initials}</span>
      )}
    </Link>
  );
}
