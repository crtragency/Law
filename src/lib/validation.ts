import { z } from "zod";

// ===========================================================================
//  مخططات التحقق من المدخلات (Zod)  —  تُستخدم في كل Server Actions
// ===========================================================================

const roleEnum = z.enum([
  "ADMIN",
  "LAWYER",
  "PARALEGAL",
  "SECRETARY",
  "ACCOUNTANT",
]);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(100),
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف").max(128),
  role: roleEnum,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  role: roleEnum,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  isActive: z.coerce.boolean(),
});

export const resetPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف").max(128),
});

export const clientSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  name: z.string().trim().min(2, "اسم الموكّل مطلوب").max(150),
  nationalId: z.string().trim().max(20).optional().or(z.literal("")),
  nationality: z.string().trim().max(60).optional().or(z.literal("")),
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
  unifiedNumber: z.string().trim().max(30).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(30).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("بريد غير صحيح")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const caseSchema = z.object({
  id: z.string().optional(),
  caseNumber: z.string().trim().min(1, "رقم القضية مطلوب").max(60),
  title: z.string().trim().min(2, "عنوان القضية مطلوب").max(200),
  clientId: z.string().min(1, "اختر الموكّل"),
  court: z.string().trim().max(150).optional().or(z.literal("")),
  caseType: z.enum([
    "CIVIL",
    "CRIMINAL",
    "COMMERCIAL",
    "FAMILY",
    "LABOR",
    "ADMINISTRATIVE",
    "OTHER",
  ]),
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "POSTPONED",
    "WON",
    "LOST",
    "CLOSED",
    "ARCHIVED",
  ]),
  assignedLawyerId: z.string().optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان المهمة مطلوب").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});

export const eventSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان الموعد مطلوب").max(200),
  type: z.enum(["HEARING", "MEETING", "DEADLINE", "APPOINTMENT", "OTHER"]),
  startAt: z.string().min(1, "حدّد التاريخ والوقت"),
  endAt: z.string().optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});


export const serviceRequestSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان الخدمة مطلوب").max(200),
  serviceArea: z.enum([
    "CONTACTS",
    "LITIGATION",
    "POWER_OF_ATTORNEY",
    "CONSULTATION",
    "ADMIN_REQUEST",
    "COMPLAINT",
    "LEGAL_TEMPLATE",
    "FILE_MANAGEMENT",
    "ALERTS",
    "REPORTING",
    "ACCOUNTING",
    "JUDICIAL_EXPENSE",
    "CLIENT_PORTAL",
    "CONTRACTS",
    "OTHER",
  ]),
  status: z
    .enum([
      "NEW",
      "IN_REVIEW",
      "IN_PROGRESS",
      "WAITING_CLIENT",
      "COMPLETED",
      "CANCELLED",
    ])
    .default("NEW"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});

export const legalContactSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "COURT",
    "GOVERNMENT",
    "OPPONENT",
    "EXPERT",
    "LAWYER",
    "SERVICE_PROVIDER",
    "CLIENT_REPRESENTATIVE",
    "OTHER",
  ]),
  name: z.string().trim().min(2, "اسم الجهة مطلوب").max(200),
  organization: z.string().trim().max(200).optional().or(z.literal("")),
  roleTitle: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("بريد غير صحيح")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
});

export const powerOfAttorneySchema = z.object({
  id: z.string().optional(),
  number: z.string().trim().min(1, "رقم الوكالة مطلوب").max(100),
  title: z.string().trim().min(2, "عنوان الوكالة مطلوب").max(200),
  status: z.enum(["ACTIVE", "EXPIRING", "EXPIRED", "REVOKED", "ARCHIVED"]),
  issuedAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  issuer: z.string().trim().max(160).optional().or(z.literal("")),
  representative: z.string().trim().max(160).optional().or(z.literal("")),
  scope: z.string().trim().max(4000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  documentUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  clientId: z.string().min(1, "اختر الموكّل"),
  caseId: z.string().optional().or(z.literal("")),
});

export const litigationStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان الإجراء مطلوب").max(200),
  stage: z.enum([
    "FILING",
    "FIRST_INSTANCE",
    "APPEAL",
    "CASSATION",
    "EXECUTION",
    "SETTLEMENT",
    "CLOSURE",
    "OTHER",
  ]),
  status: z.enum(["PLANNED", "IN_PROGRESS", "DONE", "WAITING", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  court: z.string().trim().max(160).optional().or(z.literal("")),
  circuit: z.string().trim().max(160).optional().or(z.literal("")),
  sessionDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  outcome: z.string().trim().max(2000).optional().or(z.literal("")),
  nextAction: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  caseId: z.string().min(1, "اختر القضية"),
  assignedToId: z.string().optional().or(z.literal("")),
});

export const invoiceSchema = z.object({
  id: z.string().optional(),
  number: z.string().trim().min(1, "رقم الفاتورة مطلوب").max(80),
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]),
  issueDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  amountBeforeTaxRiyals: z.string().min(1, "المبلغ مطلوب"),
  taxRate: z.coerce.number().min(0).max(100),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  clientId: z.string().min(1, "اختر الموكّل"),
  caseId: z.string().optional().or(z.literal("")),
  contractId: z.string().optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  amountRiyals: z.string().min(1, "المبلغ مطلوب"),
  paidAt: z.string().optional().or(z.literal("")),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHECK", "ONLINE", "OTHER"]),
  reference: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  invoiceId: z.string().optional().or(z.literal("")),
  clientId: z.string().min(1, "اختر الموكّل"),
});

export const judicialExpenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان المصروف مطلوب").max(200),
  category: z.enum([
    "COURT_FEE",
    "EXPERT_FEE",
    "ENFORCEMENT",
    "PUBLICATION",
    "TRANSPORTATION",
    "TRANSLATION",
    "GOVERNMENT_FEE",
    "OTHER",
  ]),
  status: z.enum(["PENDING", "APPROVED", "PAID", "REIMBURSED", "REJECTED"]),
  amountRiyals: z.string().min(1, "المبلغ مطلوب"),
  incurredAt: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  paidAt: z.string().optional().or(z.literal("")),
  vendor: z.string().trim().max(160).optional().or(z.literal("")),
  receiptUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
});

export const legalTemplateSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "عنوان النموذج مطلوب").max(200),
  category: z.enum(["CONTRACT", "MEMO", "WARNING", "LETTER", "POWER", "LAWSUIT", "EXECUTION", "OTHER"]),
  body: z.string().trim().min(10, "اكتب محتوى النموذج").max(20000),
  variables: z.string().trim().max(1000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export const templateOutputSchema = z.object({
  title: z.string().trim().min(2, "عنوان المستند مطلوب").max(200),
  content: z.string().trim().min(10, "محتوى المستند مطلوب").max(30000),
  templateId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
});

export const reminderSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["HEARING", "TASK", "SERVICE_REQUEST", "POWER_EXPIRY", "INVOICE_DUE", "EXPENSE_DUE", "CUSTOM"]),
  status: z.enum(["OPEN", "DONE", "SNOOZED", "CANCELLED"]).default("OPEN"),
  title: z.string().trim().min(2, "عنوان التنبيه مطلوب").max(200),
  dueAt: z.string().min(1, "حدد موعد التنبيه"),
  link: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  userId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "اكتب الملاحظة").max(2000),
});

/** أداة مساعدة: تحويل "" إلى undefined لحقول اختيارية. */
export function emptyToNull<T>(value: T | ""): T | null {
  return value === "" ? null : (value as T);
}
