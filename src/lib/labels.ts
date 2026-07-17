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
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  POSTPONED: "bg-orange-100 text-orange-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
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
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  HEARING: "جلسة محكمة",
  MEETING: "اجتماع",
  DEADLINE: "موعد نهائي",
  APPOINTMENT: "موعد",
  OTHER: "أخرى",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  HEARING: "bg-purple-100 text-purple-800",
  MEETING: "bg-blue-100 text-blue-800",
  DEADLINE: "bg-red-100 text-red-800",
  APPOINTMENT: "bg-teal-100 text-teal-800",
  OTHER: "bg-gray-100 text-gray-700",
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
