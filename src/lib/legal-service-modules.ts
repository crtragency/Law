import type { IconName } from "@/components/icons";

export type ServiceModuleStatus = "operational" | "covered" | "expansion";
export type ServiceModuleCategory =
  | "operations"
  | "relationships"
  | "knowledge"
  | "finance"
  | "governance";

export interface LegalServiceModule {
  slug: string;
  title: string;
  serviceArea: string;
  category: ServiceModuleCategory;
  status: ServiceModuleStatus;
  icon: IconName;
  summary: string;
  description: string;
  primaryRoute?: string;
  features: string[];
  workflows: string[];
  relatedRoutes: { href: string; label: string }[];
}

export const SERVICE_MODULE_CATEGORY_LABELS: Record<ServiceModuleCategory, string> = {
  operations: "التشغيل القانوني",
  relationships: "العلاقات والموكلون",
  knowledge: "المعرفة والصياغات",
  finance: "المالية والمصروفات",
  governance: "الإدارة والرقابة",
};

export const SERVICE_MODULE_STATUS_LABELS: Record<ServiceModuleStatus, string> = {
  operational: "تشغيلي حالياً",
  covered: "مغطى داخل النظام",
  expansion: "جاهز كمسار توسع",
};

export const SERVICE_MODULE_STATUS_COLORS: Record<ServiceModuleStatus, string> = {
  operational: "bg-brand-100 text-brand-900",
  covered: "bg-brass-50 text-brass-800",
  expansion: "bg-gray-100 text-gray-700",
};

export const LEGAL_SERVICE_MODULES: LegalServiceModule[] = [
  {
    slug: "executive-dashboard",
    title: "لوحة قيادة المكتب",
    serviceArea: "REPORTING",
    category: "governance",
    status: "operational",
    icon: "home",
    summary: "نظرة يومية على القضايا النشطة، المهام، المواعيد، وحركة المكتب.",
    description:
      "مركز متابعة للإدارة والمحامين يجمع مؤشرات العمل القانونية والتشغيلية في شاشة واحدة قابلة للتطوير بتقارير مالية وإنتاجية لاحقاً.",
    primaryRoute: "/dashboard",
    features: ["مؤشرات القضايا والموكلين", "مهام الموظف المفتوحة", "أقرب المواعيد والجلسات", "أحدث القضايا"],
    workflows: ["متابعة يومية للإدارة", "تحديد الملفات العاجلة", "مراجعة الحمل التشغيلي للفريق"],
    relatedRoutes: [{ href: "/dashboard", label: "الرئيسية" }],
  },
  {
    slug: "contacts",
    title: "جهات الاتصال القانونية",
    serviceArea: "CONTACTS",
    category: "relationships",
    status: "expansion",
    icon: "users",
    summary: "دليل شامل للموكلين والخصوم والمحاكم والجهات الحكومية والخبراء ومزودي الخدمات.",
    description:
      "يوحد بيانات العلاقات القانونية التي تظهر في الاسكرين المرجعي: جهات حكومية، محامون، عملاء، شركات خدمات، وجهات قضائية، مع إمكانية تحويل أي احتياج لطلب خدمة.",
    features: ["تصنيف الجهات حسب النوع", "ربط الجهة بالقضية أو الموكل", "بيانات تواصل وملاحظات", "تتبّع جهة مسؤولة داخل المكتب"],
    workflows: ["إضافة جهة جديدة", "استخدام الجهة في قضية", "تجهيز مراسلات أو متابعات"],
    relatedRoutes: [{ href: "/clients", label: "الموكلون الحاليون" }],
  },
  {
    slug: "litigation",
    title: "التقاضي وإدارة القضايا",
    serviceArea: "LITIGATION",
    category: "operations",
    status: "operational",
    icon: "gavel",
    summary: "إدارة دورة القضية من القيد وحتى الإغلاق مع المواعيد والمهام والمستندات.",
    description:
      "الوحدة الأساسية للعمل القانوني: رقم القضية، النوع، الحالة، المحكمة، المحامي المسؤول، المستندات، ملاحظات الفريق، المهام، والجلسات.",
    primaryRoute: "/cases",
    features: ["بيانات القضية والمحكمة", "مستندات وملاحظات", "مهام مرتبطة", "جلسات ومواعيد"],
    workflows: ["فتح قضية", "تحديث الحالة", "إرفاق مستند", "إضافة جلسة أو مهمة"],
    relatedRoutes: [
      { href: "/cases", label: "القضايا" },
      { href: "/calendar", label: "التقويم" },
      { href: "/tasks", label: "المهام" },
    ],
  },
  {
    slug: "powers-of-attorney",
    title: "التوكيلات والتفويضات",
    serviceArea: "POWER_OF_ATTORNEY",
    category: "operations",
    status: "expansion",
    icon: "shield",
    summary: "تسجيل الوكالات ومتابعة صلاحيتها وانتهائها وربطها بالموكل والقضية.",
    description:
      "مسار مهم لحماية المكتب من انتهاء التفويض أو العمل بتوكيل غير مكتمل. حالياً يمكن تسجيله كطلب خدمة، والمرحلة التالية تحويله لسجل مستقل بتاريخ انتهاء وتنبيهات.",
    features: ["نوع الوكالة", "تاريخ الإصدار والانتهاء", "الموكل والقضية المرتبطة", "تنبيه قبل الانتهاء"],
    workflows: ["استلام وكالة", "مراجعة الصلاحيات", "التنبيه للتجديد", "إرفاق نسخة الوكالة"],
    relatedRoutes: [
      { href: "/services", label: "طلبات الخدمات" },
      { href: "/cases", label: "القضايا" },
    ],
  },
  {
    slug: "consultations",
    title: "الاستشارات القانونية",
    serviceArea: "CONSULTATION",
    category: "knowledge",
    status: "expansion",
    icon: "message",
    summary: "توثيق طلب الاستشارة والرأي القانوني والمرفقات والرد النهائي.",
    description:
      "يحوّل الاستشارات من رسائل متناثرة إلى سجل معرفي يمكن الرجوع إليه، وربطه بموكل أو قضية أو عقد.",
    features: ["موضوع الاستشارة", "الوقائع والمرفقات", "المحامي المكلف", "الرأي القانوني المعتمد"],
    workflows: ["فتح طلب استشارة", "تجميع الوقائع", "صياغة الرأي", "اعتماد وتسليم الرد"],
    relatedRoutes: [
      { href: "/services", label: "طلبات الخدمات" },
      { href: "/messages", label: "الرسائل" },
    ],
  },
  {
    slug: "admin-requests",
    title: "المهام والطلبات الإدارية",
    serviceArea: "ADMIN_REQUEST",
    category: "operations",
    status: "operational",
    icon: "check",
    summary: "تنظيم الأعمال اليومية، الطلبات الداخلية، توزيع المسؤوليات، ومتابعة الإنجاز.",
    description:
      "المهام الحالية تغطي جزء التنفيذ اليومي، وطلبات الخدمات توسعها لتسجيل أي طلب إداري أو قانوني يحتاج فرزاً وتكليفاً.",
    primaryRoute: "/tasks",
    features: ["إنشاء وإسناد مهام", "حالات وأولويات", "تعليقات داخلية", "ربط بالقضية"],
    workflows: ["تكليف موظف", "تحديث الحالة", "التعليق والمتابعة", "إغلاق المهمة"],
    relatedRoutes: [
      { href: "/tasks", label: "المهام" },
      { href: "/services", label: "طلبات الخدمات" },
    ],
  },
  {
    slug: "complaints",
    title: "البلاغات والشكاوى",
    serviceArea: "COMPLAINT",
    category: "operations",
    status: "expansion",
    icon: "bell",
    summary: "إدارة البلاغ أو الشكوى من الاستلام وحتى الإغلاق مع توثيق كل إجراء.",
    description:
      "يغطي البلاغات والشكاوى الرسمية، شكاوى العملاء، البلاغات لدى الجهات المختصة، وخطوات المتابعة اللازمة.",
    features: ["نوع البلاغ", "الجهة المختصة", "الإجراء التالي", "المهلة القانونية"],
    workflows: ["تسجيل البلاغ", "تكليف المسؤول", "تحديث الإجراء", "إغلاق وتوثيق النتيجة"],
    relatedRoutes: [{ href: "/services", label: "طلبات الخدمات" }],
  },
  {
    slug: "legal-templates",
    title: "النماذج والصياغات القانونية",
    serviceArea: "LEGAL_TEMPLATE",
    category: "knowledge",
    status: "covered",
    icon: "pen",
    summary: "نماذج مذكرات، إنذارات، خطابات، عقود، وصيغ قابلة لإعادة الاستخدام.",
    description:
      "النظام يحتوي بالفعل على مولد اتفاقيات أتعاب قابل للطباعة، ويمكن توسيعه لنماذج قانونية أخرى بنفس النمط.",
    primaryRoute: "/contracts",
    features: ["اتفاقيات أتعاب مطبوعة", "بيانات شركة وموكل", "دفعات وضريبة", "مساحة لتوسيع قوالب أخرى"],
    workflows: ["اختيار نموذج", "ملء البيانات", "مراجعة قانونية", "طباعة أو أرشفة"],
    relatedRoutes: [
      { href: "/contracts", label: "اتفاقيات الأتعاب" },
      { href: "/admin/firm", label: "بيانات الشركة" },
    ],
  },
  {
    slug: "file-management",
    title: "إدارة الملفات والمستندات",
    serviceArea: "FILE_MANAGEMENT",
    category: "operations",
    status: "operational",
    icon: "paperclip",
    summary: "أرشفة ملفات القضايا وروابطها أو رفعها فعلياً إلى التخزين الخاص.",
    description:
      "تدعم القضية مستندات وروابط خارجية ورفع ملفات عبر Supabase Storage بروابط تحميل موقعة، مع فصل وصول الموظف عن بوابة العميل.",
    primaryRoute: "/cases",
    features: ["رفع ملفات حتى 50MB", "روابط خارجية", "روابط تحميل موقعة", "إتاحة انتقائية للعميل"],
    workflows: ["رفع المستند", "تسجيل بياناته", "تحميل آمن", "عرضه في بوابة العميل"],
    relatedRoutes: [
      { href: "/cases", label: "مستندات القضايا" },
      { href: "/portal", label: "بوابة العميل" },
    ],
  },
  {
    slug: "alerts",
    title: "التنبيهات والمواعيد",
    serviceArea: "ALERTS",
    category: "operations",
    status: "operational",
    icon: "clock",
    summary: "جلسات، اجتماعات، مهل نهائية، تنبيهات داخلية، وإشعارات بريد للعميل.",
    description:
      "التقويم والإشعارات والبريد تغطي المواعيد الأساسية، ويمكن استخدام طلبات الخدمات لتسجيل تنبيهات خاصة مثل انتهاء وكالة أو موعد سداد.",
    primaryRoute: "/calendar",
    features: ["تقويم جلسات ومواعيد", "إشعارات داخلية", "إشعار العميل بالبريد", "أولويات ومواعيد استحقاق"],
    workflows: ["إضافة موعد", "ربطه بقضية", "إشعار العميل", "متابعة القادم"],
    relatedRoutes: [
      { href: "/calendar", label: "التقويم" },
      { href: "/notifications", label: "الإشعارات" },
    ],
  },
  {
    slug: "reports",
    title: "التقارير والتحليلات",
    serviceArea: "REPORTING",
    category: "governance",
    status: "covered",
    icon: "file",
    summary: "مؤشرات عن الأداء، القضايا، المهام، المصروفات، والالتزامات القادمة.",
    description:
      "البيانات موجودة في النظام، والمرحلة التالية يمكن أن تكون صفحة تقارير مخصصة. حالياً لوحة القيادة وطلبات الخدمات يوفران أساس التجميع والمتابعة.",
    primaryRoute: "/dashboard",
    features: ["إحصاءات تشغيلية", "قوائم حديثة", "تجميع حسب نوع الخدمة", "جاهزية لتقارير مالية"],
    workflows: ["مراجعة الأداء", "تحديد الضغط التشغيلي", "قياس زمن إنجاز الخدمات", "متابعة المتأخرات"],
    relatedRoutes: [{ href: "/dashboard", label: "لوحة القيادة" }],
  },
  {
    slug: "accounting",
    title: "النظام المحاسبي والأتعاب",
    serviceArea: "ACCOUNTING",
    category: "finance",
    status: "covered",
    icon: "building",
    summary: "متابعة الأتعاب، الدفعات، الضريبة، والمستحقات المرتبطة بالاتفاقيات.",
    description:
      "اتفاقيات الأتعاب الحالية تمثل نواة مالية قوية؛ وطلبات الخدمات تضيف قناة لتسجيل طلبات محاسبية وفواتير أو متابعة سداد لحين بناء دفتر مالي مستقل.",
    primaryRoute: "/contracts",
    features: ["أتعاب قبل الضريبة", "حساب ضريبة القيمة المضافة", "دفعات وسداد", "حالة الاتفاقية"],
    workflows: ["إنشاء اتفاقية", "تقسيم الدفعات", "متابعة التحصيل", "طباعة الاتفاقية"],
    relatedRoutes: [{ href: "/contracts", label: "اتفاقيات الأتعاب" }],
  },
  {
    slug: "judicial-expenses",
    title: "المصروفات القضائية",
    serviceArea: "JUDICIAL_EXPENSE",
    category: "finance",
    status: "expansion",
    icon: "file",
    summary: "رسوم محاكم، خبراء، إعلانات، تنفيذ، وانتقالات مرتبطة بالقضايا.",
    description:
      "مسار مالي متخصص للقضايا. يمكن الآن تسجيل المصروف كطلب خدمة وربطه بالقضية والموكل، ثم تطويره لاحقاً لدفتر مصروفات بتقارير.",
    features: ["نوع المصروف", "القضية المرتبطة", "الموظف المسؤول", "حالة السداد أو الاسترداد"],
    workflows: ["تسجيل المصروف", "إرفاق إيصال", "اعتماد داخلي", "إضافته لتقرير مالي"],
    relatedRoutes: [
      { href: "/services", label: "طلبات الخدمات" },
      { href: "/cases", label: "القضايا" },
    ],
  },
  {
    slug: "client-portal",
    title: "بوابة العميل",
    serviceArea: "CLIENT_PORTAL",
    category: "relationships",
    status: "operational",
    icon: "user",
    summary: "دخول مستقل للعميل لمتابعة قضاياه ومستنداته ومواعيده.",
    description:
      "بوابة منفصلة عن جلسات الموظفين، تعرض للعميل ما يخصه فقط، وتدعم تفعيل الدخول من صفحة الموكلين.",
    primaryRoute: "/portal",
    features: ["جلسات عميل مستقلة", "عرض القضايا الخاصة", "تنزيل مستندات آمن", "متابعة المواعيد"],
    workflows: ["تفعيل بوابة موكل", "إرسال بيانات الدخول", "متابعة القضايا", "إشعار العميل بالتحديثات"],
    relatedRoutes: [
      { href: "/clients", label: "إدارة الموكلين" },
      { href: "/portal", label: "بوابة العميل" },
    ],
  },
  {
    slug: "contracts",
    title: "العقود واتفاقيات الأتعاب",
    serviceArea: "CONTRACTS",
    category: "finance",
    status: "operational",
    icon: "file",
    summary: "إنشاء اتفاقيات أتعاب قانونية قابلة للطباعة وربطها بالموكل والقضية.",
    description:
      "تغطي بيانات الطرفين، نطاق العمل، المبلغ قبل الضريبة، الضريبة، الدفعات، والحالة، مع مستند اتفاقية جاهز للطباعة.",
    primaryRoute: "/contracts",
    features: ["ربط بالموكل والقضية", "نطاق عمل تفصيلي", "حساب ضريبة ودفعات", "مستند مطبوع"],
    workflows: ["إنشاء اتفاقية", "مراجعة بيانات الأطراف", "تقسيم الدفعات", "طباعة وتوقيع"],
    relatedRoutes: [{ href: "/contracts", label: "اتفاقيات الأتعاب" }],
  },
  {
    slug: "team-governance",
    title: "إدارة الفريق والصلاحيات",
    serviceArea: "OTHER",
    category: "governance",
    status: "operational",
    icon: "shield",
    summary: "إدارة حسابات الموظفين، الأدوار، الصلاحيات، وسجل التدقيق.",
    description:
      "طبقة الحوكمة التي تحافظ على أمان النظام: مستخدمون بصلاحيات، جلسات قابلة للإلغاء، وسجل تدقيق للعمليات الحساسة.",
    primaryRoute: "/admin/users",
    features: ["إدارة المستخدمين", "RBAC", "سجل تدقيق", "إلغاء جلسات عند التعطيل أو تغيير كلمة السر"],
    workflows: ["إنشاء موظف", "تحديد الدور", "مراجعة العمليات", "تعطيل الحساب عند الحاجة"],
    relatedRoutes: [
      { href: "/admin/users", label: "الموظفون" },
      { href: "/admin/audit", label: "سجل التدقيق" },
    ],
  },
];

export function getLegalServiceModule(slug: string) {
  return LEGAL_SERVICE_MODULES.find((module) => module.slug === slug) ?? null;
}

export function modulesByCategory(category: ServiceModuleCategory) {
  return LEGAL_SERVICE_MODULES.filter((module) => module.category === category);
}