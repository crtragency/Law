import "server-only";

export interface CaseHealthInput {
  assignedLawyerId?: string | null;
  court?: string | null;
  description?: string | null;
  documentsCount: number;
  pendingDocumentRequestsCount: number;
  openTasksCount: number;
  overdueTasksCount: number;
  upcomingEventsCount: number;
  litigationStepsCount: number;
  contractsCount: number;
  powersCount: number;
  clientPortalEnabled?: boolean;
}

export interface CaseHealthItem {
  label: string;
  done: boolean;
  weight: number;
  hint: string;
}

export function buildCaseHealth(input: CaseHealthInput) {
  const items: CaseHealthItem[] = [
    {
      label: "مسؤول محدد",
      done: !!input.assignedLawyerId,
      weight: 10,
      hint: "اسند محامياً أو مسؤولاً واضحاً للقضية.",
    },
    {
      label: "بيانات القضية الأساسية",
      done: !!input.court && !!input.description,
      weight: 10,
      hint: "أكمل المحكمة والوصف المختصر حتى لا يبدأ الفريق من فراغ.",
    },
    {
      label: "مستندات مرفوعة",
      done: input.documentsCount > 0,
      weight: 15,
      hint: "ارفع صحيفة الدعوى أو الحكم أو أي مستند تأسيسي.",
    },
    {
      label: "لا توجد مستندات ناقصة",
      done: input.pendingDocumentRequestsCount === 0,
      weight: 10,
      hint: "تابع المستندات المطلوبة من العميل حتى يتم استلامها.",
    },
    {
      label: "خطة عمل مفتوحة",
      done: input.openTasksCount > 0,
      weight: 10,
      hint: "أضف مهمة متابعة أو تجهيز حتى يعرف الموظف الخطوة القادمة.",
    },
    {
      label: "لا توجد مهام متأخرة",
      done: input.overdueTasksCount === 0,
      weight: 15,
      hint: "راجع المهام المتأخرة قبل أي إجراء جديد.",
    },
    {
      label: "موعد أو إجراء تقاضي قادم",
      done: input.upcomingEventsCount > 0 || input.litigationStepsCount > 0,
      weight: 15,
      hint: "سجل جلسة أو مهلة أو إجراء تقاضي مرتبط بالقضية.",
    },
    {
      label: "اتفاق أتعاب مربوط",
      done: input.contractsCount > 0,
      weight: 10,
      hint: "اربط اتفاقية الأتعاب بالقضية لضبط المسؤولية المالية.",
    },
    {
      label: "وكالة أو تفويض",
      done: input.powersCount > 0,
      weight: 5,
      hint: "اربط الوكالة أو التفويض حتى يظهر نقص التمثيل مبكراً.",
    },
    {
      label: "بوابة العميل مفعلة",
      done: !!input.clientPortalEnabled,
      weight: 10,
      hint: "فعّل بوابة العميل لتقليل الاتصالات اليدوية.",
    },
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const achieved = items
    .filter((item) => item.done)
    .reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round((achieved / totalWeight) * 100);
  const missing = items.filter((item) => !item.done);

  return {
    score,
    level: score >= 85 ? "مستقرة" : score >= 65 ? "تحتاج متابعة" : "عالية المخاطر",
    badgeClass:
      score >= 85
        ? "bg-brand-50 text-brand-800"
        : score >= 65
          ? "bg-brass-50 text-brass-800"
          : "bg-seal-50 text-seal-700",
    items,
    missing,
  };
}
