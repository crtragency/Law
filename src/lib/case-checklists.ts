interface ChecklistDocument {
  title: string;
  category: string | null;
}

interface ChecklistTask {
  title: string;
  status: string;
}

export interface CaseChecklistInput {
  caseType: string;
  court: string | null;
  description: string | null;
  documents: ChecklistDocument[];
  tasks: ChecklistTask[];
  eventsCount: number;
  litigationStepsCount: number;
  contractsCount: number;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
  hint: string;
}

const includesAny = (value: string | null | undefined, needles: string[]) => {
  const text = (value ?? "").toLowerCase();
  return needles.some((needle) => text.includes(needle.toLowerCase()));
};

function hasDocument(input: CaseChecklistInput, needles: string[]) {
  return input.documents.some(
    (doc) => includesAny(doc.title, needles) || includesAny(doc.category, needles)
  );
}

function hasTask(input: CaseChecklistInput, needles: string[]) {
  return input.tasks.some((task) => includesAny(task.title, needles));
}

function item(label: string, done: boolean, hint: string): ChecklistItem {
  return { label, done, hint };
}

export function buildCaseChecklist(input: CaseChecklistInput): ChecklistItem[] {
  const common = [
    item("بيانات المحكمة أو الجهة المختصة", !!input.court, "أضف المحكمة أو الدائرة في بيانات القضية."),
    item("وصف وقائع القضية", !!input.description?.trim(), "اكتب ملخص الوقائع والطلبات الأساسية."),
    item("مستند هوية أو سجل العميل", hasDocument(input, ["هوية", "بطاقة", "سجل", "إقامة"]), "ارفع هوية العميل أو السجل التجاري."),
    item("توكيل أو تفويض", hasDocument(input, ["توكيل", "تفويض", "وكالة"]), "ارفع التوكيل أو التفويض المرتبط بالقضية."),
    item("موعد أو جلسة قادمة", input.eventsCount > 0, "أضف أول جلسة أو موعد متابعة."),
    item("مهمة متابعة داخلية", input.tasks.length > 0, "أنشئ مهمة واضحة للمسؤول عن الخطوة القادمة."),
    item("اتفاقية أتعاب", input.contractsCount > 0, "اربط اتفاقية أتعاب بالقضية."),
  ];

  const byType: Record<string, ChecklistItem[]> = {
    LABOR: [
      item("عقد العمل", hasDocument(input, ["عقد عمل", "العمل"]), "اطلب أو ارفع عقد العمل."),
      item("مسيرات الرواتب أو كشف المستحقات", hasDocument(input, ["راتب", "رواتب", "مستحقات"]), "أضف مستندات الرواتب والمستحقات."),
      item("خطوة تسوية ودية", input.litigationStepsCount > 0 || hasTask(input, ["تسوية"]), "سجل خطوة التسوية الودية أو مهمة تجهيزها."),
    ],
    FAMILY: [
      item("صك أو وثيقة الحالة الشخصية", hasDocument(input, ["صك", "زواج", "طلاق", "حضانة"]), "أضف الصكوك أو الوثائق الشخصية."),
      item("بيانات الأطراف والأبناء", hasDocument(input, ["أبناء", "أسرة", "حضانة"]) || hasTask(input, ["بيانات الأطراف"]), "وثق بيانات الأطراف والأبناء إن وجدت."),
    ],
    COMMERCIAL: [
      item("العقد أو الاتفاق التجاري", hasDocument(input, ["عقد", "اتفاق", "أمر شراء"]), "أضف العقد أو أمر الشراء أو الاتفاق."),
      item("فواتير أو كشف حساب", hasDocument(input, ["فاتورة", "كشف", "حساب"]), "أضف الفواتير وكشوف الحساب."),
      item("سجل تجاري للطرف ذي العلاقة", hasDocument(input, ["سجل تجاري", "سجل"]), "أضف السجل التجاري عند الحاجة."),
    ],
    CRIMINAL: [
      item("محضر أو بلاغ رسمي", hasDocument(input, ["محضر", "بلاغ", "شرطة"]), "أضف المحضر أو البلاغ الرسمي."),
      item("مرفقات الإثبات", hasDocument(input, ["إثبات", "دليل", "صورة", "فيديو"]), "أضف أدلة الإثبات والمرفقات."),
    ],
    ADMINISTRATIVE: [
      item("قرار إداري محل النزاع", hasDocument(input, ["قرار", "خطاب", "إشعار"]), "أضف القرار أو الخطاب الإداري."),
      item("تظلم أو اعتراض", hasDocument(input, ["تظلم", "اعتراض"]) || hasTask(input, ["تظلم"]), "سجل مستند أو مهمة التظلم/الاعتراض."),
    ],
    CIVIL: [
      item("مستند الحق أو المطالبة", hasDocument(input, ["عقد", "إقرار", "مطالبة", "إيصال"]), "أضف سند الحق أو المطالبة."),
      item("مستندات الإثبات", hasDocument(input, ["إثبات", "دليل", "مرفق"]), "أضف مستندات الإثبات الرئيسية."),
    ],
  };

  return [...common, ...(byType[input.caseType] ?? [])];
}
