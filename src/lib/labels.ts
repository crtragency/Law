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


export const SERVICE_AREA_LABELS: Record<string, string> = {
  CONTACTS: "جهات الاتصال",
  LITIGATION: "التقاضي والقضايا",
  POWER_OF_ATTORNEY: "التوكيلات والتفويضات",
  CONSULTATION: "الاستشارات القانونية",
  ADMIN_REQUEST: "المهام والطلبات الإدارية",
  COMPLAINT: "البلاغات والشكاوى",
  LEGAL_TEMPLATE: "النماذج والصياغات القانونية",
  FILE_MANAGEMENT: "إدارة الملفات والمستندات",
  ALERTS: "التنبيهات والمواعيد",
  REPORTING: "التقارير ولوحات المتابعة",
  ACCOUNTING: "الحسابات والفواتير",
  JUDICIAL_EXPENSE: "المصروفات القضائية",
  CLIENT_PORTAL: "بوابة العميل",
  CONTRACTS: "العقود واتفاقيات الأتعاب",
  OTHER: "أخرى",
};

export const SERVICE_AREA_DESCRIPTIONS: Record<string, string> = {
  CONTACTS: "جهات حكومية، محاكم، خبراء، خصوم، محامون، مزودو خدمات، وجهات داعمة للعمل القانوني.",
  LITIGATION: "متابعة دورة القضية من القيد وحتى الحكم والتنفيذ مع الجلسات والمستندات والمهام.",
  POWER_OF_ATTORNEY: "إدارة الوكالات والتفويضات، تواريخ الإصدار والانتهاء، وربطها بالموكل والقضية.",
  CONSULTATION: "تسجيل الاستشارات، الرأي القانوني، المرفقات، والردود المعتمدة للموكلين.",
  ADMIN_REQUEST: "طلبات داخلية وإدارية مرتبطة بتشغيل المكتب وتوزيع العمل بين الفريق.",
  COMPLAINT: "إدارة البلاغات والشكاوى منذ الاستلام حتى الإغلاق مع توثيق الإجراءات.",
  LEGAL_TEMPLATE: "نماذج مذكرات، عقود، إنذارات، خطابات، وصيغ قانونية قابلة لإعادة الاستخدام.",
  FILE_MANAGEMENT: "أرشفة وتنظيم الملفات والمستندات وربطها بالموكلين والقضايا والخدمات.",
  ALERTS: "تنبيهات المواعيد الحساسة، الجلسات، انتهاء الوكالات، والمهل القانونية.",
  REPORTING: "مؤشرات الأداء، الإنتاجية، حالات القضايا، المصروفات، والتقارير الإدارية.",
  ACCOUNTING: "أتعاب، دفعات، فواتير، مستحقات، ومتابعة مالية مرتبطة بالملفات القانونية.",
  JUDICIAL_EXPENSE: "رسوم محاكم، مصاريف تنفيذ، خبراء، إعلانات، وانتقالات مرتبطة بالقضايا.",
  CLIENT_PORTAL: "خدمات متابعة العميل لقضاياه ومستنداته ومواعيده من بوابة مستقلة.",
  CONTRACTS: "صياغة ومتابعة العقود واتفاقيات الأتعاب والمدفوعات المرتبطة بها.",
  OTHER: "أي خدمة خاصة لا تقع تحت التصنيفات الحالية.",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  IN_REVIEW: "قيد المراجعة",
  IN_PROGRESS: "جار التنفيذ",
  WAITING_CLIENT: "بانتظار العميل",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
};

export const SERVICE_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-brand-50 text-brand-800",
  IN_REVIEW: "bg-brass-50 text-brass-700",
  IN_PROGRESS: "bg-brass-100 text-brass-800",
  WAITING_CLIENT: "bg-gray-100 text-gray-700",
  COMPLETED: "bg-brand-100 text-brand-900",
  CANCELLED: "bg-seal-50 text-seal-700",
};

export const SERVICE_PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export const SERVICE_PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-brand-50 text-brand-700",
  HIGH: "bg-brass-100 text-brass-800",
  URGENT: "bg-seal-50 text-seal-700",
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
