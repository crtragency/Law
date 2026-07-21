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
  SENT: "مرسلة للعميل",
  CLIENT_SIGNED: "وقّع العميل",
  ACTIVE: "سارية",
  COMPLETED: "منتهية",
  CANCELLED: "ملغاة",
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-brass-50 text-brass-800",
  CLIENT_SIGNED: "bg-brand-50 text-brand-800",
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

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  COURT: "محكمة / دائرة",
  GOVERNMENT: "جهة حكومية",
  OPPONENT: "خصم أو طرف مقابل",
  EXPERT: "خبير",
  LAWYER: "محامٍ",
  SERVICE_PROVIDER: "مزود خدمة",
  CLIENT_REPRESENTATIVE: "ممثل موكّل",
  OTHER: "أخرى",
};

export const POWER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "سارية",
  EXPIRING: "قاربت الانتهاء",
  EXPIRED: "منتهية",
  REVOKED: "ملغاة",
  ARCHIVED: "مؤرشفة",
};

export const POWER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-brand-50 text-brand-800",
  EXPIRING: "bg-brass-100 text-brass-800",
  EXPIRED: "bg-seal-50 text-seal-700",
  REVOKED: "bg-seal-50 text-seal-700",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export const LITIGATION_STAGE_LABELS: Record<string, string> = {
  FILING: "قيد الدعوى",
  FIRST_INSTANCE: "درجة أولى",
  APPEAL: "استئناف",
  CASSATION: "نقض / عليا",
  EXECUTION: "تنفيذ",
  SETTLEMENT: "تسوية",
  CLOSURE: "إغلاق",
  OTHER: "أخرى",
};

export const LITIGATION_STEP_STATUS_LABELS: Record<string, string> = {
  PLANNED: "مخطط",
  IN_PROGRESS: "جار التنفيذ",
  DONE: "منجز",
  WAITING: "بانتظار",
  CANCELLED: "ملغى",
};

export const LITIGATION_STEP_STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-brass-50 text-brass-700",
  DONE: "bg-brand-50 text-brand-800",
  WAITING: "bg-brass-100 text-brass-800",
  CANCELLED: "bg-seal-50 text-seal-700",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  SENT: "مرسلة",
  PARTIALLY_PAID: "مدفوعة جزئياً",
  PAID: "مدفوعة",
  OVERDUE: "متأخرة",
  CANCELLED: "ملغاة",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-brand-50 text-brand-800",
  PARTIALLY_PAID: "bg-brass-50 text-brass-800",
  PAID: "bg-brand-100 text-brand-900",
  OVERDUE: "bg-seal-50 text-seal-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقداً",
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة",
  CHECK: "شيك",
  ONLINE: "دفع إلكتروني",
  OTHER: "أخرى",
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  COURT_FEE: "رسوم محكمة",
  EXPERT_FEE: "أتعاب خبير",
  ENFORCEMENT: "تنفيذ",
  PUBLICATION: "إعلان ونشر",
  TRANSPORTATION: "انتقالات",
  TRANSLATION: "ترجمة",
  GOVERNMENT_FEE: "رسوم حكومية",
  OTHER: "أخرى",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "معتمد",
  PAID: "مدفوع",
  REIMBURSED: "مسترد",
  REJECTED: "مرفوض",
};

export const EXPENSE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-brass-50 text-brass-800",
  APPROVED: "bg-brand-50 text-brand-800",
  PAID: "bg-brand-100 text-brand-900",
  REIMBURSED: "bg-gray-100 text-gray-700",
  REJECTED: "bg-seal-50 text-seal-700",
};

export const DOCUMENT_REQUEST_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "مطلوب من العميل",
  RECEIVED: "تم الاستلام",
  WAIVED: "تم الاستغناء عنه",
};

export const DOCUMENT_REQUEST_STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-brass-50 text-brass-800",
  RECEIVED: "bg-brand-50 text-brand-800",
  WAIVED: "bg-gray-100 text-gray-600",
};

export const DOCUMENT_OCR_STATUS_LABELS: Record<string, string> = {
  NOT_INDEXED: "غير مفهرس",
  INDEXED: "مفهرس",
  NEEDS_OCR: "يحتاج قراءة",
  FAILED: "فشل الفهرسة",
};

export const DOCUMENT_OCR_STATUS_COLORS: Record<string, string> = {
  NOT_INDEXED: "bg-gray-100 text-gray-600",
  INDEXED: "bg-brand-50 text-brand-800",
  NEEDS_OCR: "bg-brass-50 text-brass-800",
  FAILED: "bg-seal-50 text-seal-700",
};

export const LEGAL_TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  CONTRACT: "عقد",
  MEMO: "مذكرة",
  WARNING: "إنذار",
  LETTER: "خطاب",
  POWER: "وكالة",
  LAWSUIT: "لائحة دعوى",
  EXECUTION: "تنفيذ",
  OTHER: "أخرى",
};

export const MESSAGE_TEMPLATE_CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "بريد إلكتروني",
  WHATSAPP: "واتساب",
  PORTAL: "بوابة العميل",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الاعتماد",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغى",
};

export const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-brass-50 text-brass-800",
  APPROVED: "bg-brand-50 text-brand-800",
  REJECTED: "bg-seal-50 text-seal-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export const APPROVAL_TYPE_LABELS: Record<string, string> = {
  CONTRACT_APPROVAL: "اعتماد عقد",
  DOCUMENT_VISIBILITY: "إظهار مستند للعميل",
  DELETE_REQUEST: "طلب حذف",
  FINANCE_DISCOUNT: "خصم أو تعديل مالي",
  GENERAL: "اعتماد عام",
};

export const REMINDER_TYPE_LABELS: Record<string, string> = {
  HEARING: "جلسة",
  TASK: "مهمة",
  SERVICE_REQUEST: "طلب خدمة",
  POWER_EXPIRY: "انتهاء وكالة",
  INVOICE_DUE: "استحقاق فاتورة",
  EXPENSE_DUE: "استحقاق مصروف",
  CUSTOM: "مخصص",
};

export const REMINDER_STATUS_LABELS: Record<string, string> = {
  OPEN: "مفتوح",
  DONE: "منجز",
  SNOOZED: "مؤجل",
  CANCELLED: "ملغى",
};

export const REMINDER_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-brand-50 text-brand-800",
  DONE: "bg-brand-100 text-brand-900",
  SNOOZED: "bg-brass-50 text-brass-800",
  CANCELLED: "bg-gray-100 text-gray-600",
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
