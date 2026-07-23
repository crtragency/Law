import type { Role } from "@prisma/client";

// ===========================================================================
//  نظام الصلاحيات (RBAC)  —  تحديد ما يستطيع كل دور فعله
// ===========================================================================

export type Permission =
  | "users.manage" // إدارة حسابات الموظفين (أدمن فقط)
  | "clients.view"
  | "clients.manage"
  | "cases.view"
  | "cases.manage"
  | "documents.view"
  | "documents.manage"
  | "tasks.view"
  | "tasks.manage" // إنشاء/تعديل/إسناد المهام
  | "tasks.assignOthers" // إسناد مهام لموظفين آخرين
  | "events.view"
  | "events.manage"
  | "services.view" // عرض كتالوج الخدمات وطلبات الخدمات القانونية
  | "services.manage" // إنشاء ومتابعة طلبات الخدمات القانونية
  | "consultations.view"
  | "consultations.manage"
  | "library.view"
  | "library.manage"
  | "contacts.view"
  | "contacts.manage"
  | "powers.view"
  | "powers.manage"
  | "litigation.view"
  | "litigation.manage"
  | "finance.view"
  | "finance.manage"
  | "templates.view"
  | "templates.manage"
  | "search.view"
  | "reports.view"
  | "reminders.view"
  | "reminders.manage"
  | "contracts.view" // عرض اتفاقيات الأتعاب
  | "contracts.manage" // إنشاء/تعديل الاتفاقيات
  | "approvals.view"
  | "approvals.manage"
  | "attendance.manage"
  | "employeeRequests.manage"
  | "firm.manage" // تعديل بيانات الشركة (أدمن فقط)
  | "audit.view"; // عرض سجل التدقيق (أدمن فقط)

export const PERMISSION_LABELS: Record<Permission, string> = {
  "users.manage": "إدارة الموظفين",
  "clients.view": "عرض الموكلين",
  "clients.manage": "إدارة الموكلين",
  "cases.view": "عرض القضايا",
  "cases.manage": "إدارة القضايا",
  "documents.view": "عرض الملفات",
  "documents.manage": "إدارة الملفات",
  "tasks.view": "عرض المهام",
  "tasks.manage": "إدارة المهام",
  "tasks.assignOthers": "إسناد المهام للآخرين",
  "events.view": "عرض التقويم",
  "events.manage": "إدارة التقويم",
  "services.view": "عرض الخدمات",
  "services.manage": "إدارة طلبات الخدمات",
  "consultations.view": "عرض الاستشارات",
  "consultations.manage": "إدارة الاستشارات",
  "library.view": "عرض المكتبة القانونية",
  "library.manage": "إدارة المكتبة القانونية",
  "contacts.view": "عرض جهات الاتصال",
  "contacts.manage": "إدارة جهات الاتصال",
  "powers.view": "عرض التوكيلات",
  "powers.manage": "إدارة التوكيلات",
  "litigation.view": "عرض التقاضي والجلسات",
  "litigation.manage": "إدارة التقاضي والجلسات",
  "finance.view": "عرض المالية",
  "finance.manage": "إدارة المالية",
  "templates.view": "عرض النماذج",
  "templates.manage": "إدارة النماذج",
  "search.view": "البحث العام",
  "reports.view": "عرض التقارير",
  "reminders.view": "عرض التنبيهات",
  "reminders.manage": "إدارة التنبيهات",
  "contracts.view": "عرض اتفاقيات الأتعاب",
  "contracts.manage": "إدارة اتفاقيات الأتعاب",
  "approvals.view": "عرض الموافقات",
  "approvals.manage": "إدارة الموافقات",
  "attendance.manage": "إدارة الحضور والانصراف",
  "employeeRequests.manage": "إدارة طلبات الموظفين",
  "firm.manage": "إدارة بيانات الشركة",
  "audit.view": "سجل التدقيق والبريد",
};

export const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  {
    title: "الإدارة",
    permissions: [
      "users.manage",
      "attendance.manage",
      "employeeRequests.manage",
      "firm.manage",
      "audit.view",
      "reports.view",
      "search.view",
    ],
  },
  {
    title: "العملاء والقضايا",
    permissions: [
      "clients.view",
      "clients.manage",
      "cases.view",
      "cases.manage",
      "contacts.view",
      "contacts.manage",
      "powers.view",
      "powers.manage",
    ],
  },
  {
    title: "التشغيل القانوني",
    permissions: [
      "litigation.view",
      "litigation.manage",
      "tasks.view",
      "tasks.manage",
      "tasks.assignOthers",
      "events.view",
      "events.manage",
      "documents.view",
      "documents.manage",
    ],
  },
  {
    title: "الخدمات والمعرفة",
    permissions: [
      "services.view",
      "services.manage",
      "consultations.view",
      "consultations.manage",
      "library.view",
      "library.manage",
      "templates.view",
      "templates.manage",
    ],
  },
  {
    title: "المال والمتابعة",
    permissions: [
      "finance.view",
      "finance.manage",
      "contracts.view",
      "contracts.manage",
      "approvals.view",
      "approvals.manage",
      "reminders.view",
      "reminders.manage",
    ],
  },
];

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "users.manage",
    "clients.view",
    "clients.manage",
    "cases.view",
    "cases.manage",
    "documents.view",
    "documents.manage",
    "tasks.view",
    "tasks.manage",
    "tasks.assignOthers",
    "events.view",
    "events.manage",
    "services.view",
    "services.manage",
    "consultations.view",
    "consultations.manage",
    "library.view",
    "library.manage",
    "contacts.view",
    "contacts.manage",
    "powers.view",
    "powers.manage",
    "litigation.view",
    "litigation.manage",
    "finance.view",
    "finance.manage",
    "templates.view",
    "templates.manage",
    "search.view",
    "reports.view",
    "reminders.view",
    "reminders.manage",
    "contracts.view",
    "contracts.manage",
    "approvals.view",
    "approvals.manage",
    "attendance.manage",
    "employeeRequests.manage",
    "firm.manage",
    "audit.view",
  ],
  LAWYER: [
    "clients.view",
    "clients.manage",
    "cases.view",
    "cases.manage",
    "documents.view",
    "documents.manage",
    "tasks.view",
    "tasks.manage",
    "tasks.assignOthers",
    "events.view",
    "events.manage",
    "services.view",
    "services.manage",
    "consultations.view",
    "consultations.manage",
    "library.view",
    "library.manage",
    "contacts.view",
    "contacts.manage",
    "powers.view",
    "powers.manage",
    "litigation.view",
    "litigation.manage",
    "finance.view",
    "templates.view",
    "templates.manage",
    "search.view",
    "reports.view",
    "reminders.view",
    "reminders.manage",
    "contracts.view",
    "contracts.manage",
    "approvals.view",
    "approvals.manage",
  ],
  PARALEGAL: [
    "clients.view",
    "cases.view",
    "cases.manage",
    "documents.view",
    "documents.manage",
    "tasks.view",
    "tasks.manage",
    "events.view",
    "events.manage",
    "services.view",
    "services.manage",
    "consultations.view",
    "consultations.manage",
    "library.view",
    "library.manage",
    "contacts.view",
    "contacts.manage",
    "powers.view",
    "powers.manage",
    "litigation.view",
    "litigation.manage",
    "templates.view",
    "templates.manage",
    "search.view",
    "reports.view",
    "reminders.view",
    "reminders.manage",
    "approvals.view",
  ],
  SECRETARY: [
    "clients.view",
    "clients.manage",
    "cases.view",
    "documents.view",
    "tasks.view",
    "events.view",
    "events.manage",
    "services.view",
    "services.manage",
    "consultations.view",
    "consultations.manage",
    "library.view",
    "contacts.view",
    "contacts.manage",
    "powers.view",
    "powers.manage",
    "litigation.view",
    "search.view",
    "reports.view",
    "reminders.view",
    "reminders.manage",
    "contracts.view",
    "approvals.view",
  ],
  ACCOUNTANT: [
    "clients.view",
    "cases.view",
    "tasks.view",
    "events.view",
    "services.view",
    "services.manage",
    "consultations.view",
    "contacts.view",
    "finance.view",
    "finance.manage",
    "contracts.view",
    "contracts.manage",
    "search.view",
    "reports.view",
    "reminders.view",
    "approvals.view",
  ],
};

type PermissionSubject = Role | { role: Role; permissionOverridesJson?: string | null };

export function parsePermissionOverrides(value?: string | null): Permission[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter((item): item is Permission =>
      typeof item === "string" && ALL_PERMISSIONS.includes(item as Permission)
    );
    return [...new Set(valid)];
  } catch {
    return null;
  }
}

export function serializePermissionOverrides(permissions: Permission[]): string {
  const valid = permissions.filter((permission) => ALL_PERMISSIONS.includes(permission));
  return JSON.stringify([...new Set(valid)].sort());
}

export function effectivePermissionsFor(
  subject: PermissionSubject
): Permission[] {
  if (typeof subject === "string") return ROLE_PERMISSIONS[subject] ?? [];
  return parsePermissionOverrides(subject.permissionOverridesJson) ?? ROLE_PERMISSIONS[subject.role] ?? [];
}

/** هل يملك هذا الدور/المستخدم صلاحية معيّنة؟ */
export function hasPermission(subject: PermissionSubject, permission: Permission): boolean {
  return effectivePermissionsFor(subject).includes(permission);
}

/** الأسماء العربية للأدوار للعرض في الواجهة. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "مدير المكتب",
  LAWYER: "محامي",
  PARALEGAL: "مساعد قانوني",
  SECRETARY: "سكرتير",
  ACCOUNTANT: "محاسب",
};
