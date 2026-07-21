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
  | "firm.manage" // تعديل بيانات الشركة (أدمن فقط)
  | "audit.view"; // عرض سجل التدقيق (أدمن فقط)

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

/** هل يملك هذا الدور صلاحية معيّنة؟ */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** الأسماء العربية للأدوار للعرض في الواجهة. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "مدير المكتب",
  LAWYER: "محامي",
  PARALEGAL: "مساعد قانوني",
  SECRETARY: "سكرتير",
  ACCOUNTANT: "محاسب",
};
