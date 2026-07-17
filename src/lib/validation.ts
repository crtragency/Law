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
  name: z.string().trim().min(2, "اسم الموكّل مطلوب").max(150),
  nationalId: z.string().trim().max(20).optional().or(z.literal("")),
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

export const commentSchema = z.object({
  body: z.string().trim().min(1, "اكتب الملاحظة").max(2000),
});

/** أداة مساعدة: تحويل "" إلى undefined لحقول اختيارية. */
export function emptyToNull<T>(value: T | ""): T | null {
  return value === "" ? null : (value as T);
}
