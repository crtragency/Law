// التسميات العربية لقيم الحالات والأنواع للعرض في الواجهة.

export const CASE_STATUS_LABELS: Record<string, string> = {
  OPEN: "مفتوحة",
  IN_PROGRESS: "جارية",
  POSTPONED: "مؤجلة",
  WON: "كُسبت",
  LOST: "خُسرت",
  CLOSED: "مغلقة",
  ARCHIVED: "مؤرشفة",
};

export const CASE_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-brand-50 text-brand-800",
  IN_PROGRESS: "bg-brass-50 text-brass-700",
  POSTPONED: "bg-brass-100 text-brass-800",
  WON: "bg-brand-100 text-brand-900",
  LOST: "bg-seal-50 text-seal-700",
  CLOSED: "bg-gray-200 text-gray-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  CIVIL: "مدني",
  CRIMINAL: "جنائي",
  COMMERCIAL: "تجاري",
  FAMILY: "أحوال شخصية",
  LABOR: "عمالي",
  ADMINISTRATIVE: "إداري",
  OTHER: "أخرى",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "للعمل",
  IN_PROGRESS: "جارية",
  DONE: "منتهية",
  CANCELLED: "ملغاة",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-brass-50 text-brass-700",
  DONE: "bg-brand-50 text-brand-800",
  CANCELLED: "bg-seal-50 text-seal-700",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-brand-50 text-brand-700",
  HIGH: "bg-brass-100 text-brass-800",
  URGENT: "bg-seal-50 text-seal-700",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودّة",
  ACTIVE: "سارية",
  COMPLETED: "منتهية",
  CANCELLED: "ملغاة",
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-brand-50 text-brand-800",
  COMPLETED: "bg-brand-100 text-brand-900",
  CANCELLED: "bg-seal-50 text-seal-700",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  HEARING: "جلسة محكمة",
  MEETING: "اجتماع",
  DEADLINE: "موعد نهائي",
  APPOINTMENT: "موعد",
  OTHER: "أخرى",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  HEARING: "bg-brand-100 text-brand-900",
  MEETING: "bg-gray-100 text-gray-700",
  DEADLINE: "bg-seal-50 text-seal-700",
  APPOINTMENT: "bg-brass-50 text-brass-700",
  OTHER: "bg-gray-100 text-gray-500",
};

/** تنسيق التاريخ بالعربية. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** تنسيق التاريخ والوقت بالعربية. */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
