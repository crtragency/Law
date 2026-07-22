"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { ensurePermission, AuthError } from "@/lib/auth";
import { revokeAllSessions } from "@/lib/session";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { sendEmail, appUrl } from "@/lib/email";
import { ALL_PERMISSIONS, serializePermissionOverrides, type Permission } from "@/lib/rbac";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const admin = await ensurePermission("users.manage");
    return { id: admin.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function createUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const g = await guard();
  if ("ok" in g) return g;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const strength = validatePasswordStrength(parsed.data.password);
  if (strength) return { ok: false, error: strength };

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { ok: false, error: "هذا البريد مستخدم بالفعل" };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      createdById: g.id,
    },
  });

  await audit({
    action: "user.create",
    userId: g.id,
    entity: "User",
    entityId: user.id,
    ip: await getClientIp(),
    details: { email: user.email, role: user.role },
  });
  const url = appUrl();
  await sendEmail({
    to: user.email,
    subject: "تم إنشاء حسابك في نظام مكتب المحاماة",
    heading: "تم إنشاء حسابك",
    lines: [
      `مرحبًا ${user.name}`,
      `بريد الدخول: ${user.email}`,
      `كلمة المرور المؤقتة: ${parsed.data.password}`,
      "يمكنك تسجيل الدخول ومتابعة المهام والإشعارات الخاصة بك من لوحة المكتب.",
    ],
    actionLabel: url ? "تسجيل الدخول" : undefined,
    actionUrl: url ? `${url}/login` : undefined,
  });

  revalidatePath("/admin/users");
  return { ok: true, success: "تم إنشاء حساب الموظف بنجاح" };
}

export async function updateUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const g = await guard();
  if ("ok" in g) return g;

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    role: formData.get("role"),
    phone: formData.get("phone") ?? "",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }
  const useCustomPermissions = formData.get("useCustomPermissions") === "on";
  const selectedPermissions = formData
    .getAll("permissions")
    .filter((permission): permission is Permission =>
      typeof permission === "string" && ALL_PERMISSIONS.includes(permission as Permission)
    );
  const permissionOverridesJson = useCustomPermissions
    ? serializePermissionOverrides(selectedPermissions)
    : null;
  if (useCustomPermissions && selectedPermissions.length === 0) {
    return { ok: false, error: "اختر صلاحية واحدة على الأقل أو ألغِ الصلاحيات المخصصة" };
  }

  // منع المدير من تعطيل حسابه أو تنزيل دوره (تجنّب قفل نفسه خارج النظام).
  if (parsed.data.id === g.id) {
    if (!parsed.data.isActive) {
      return { ok: false, error: "لا يمكنك تعطيل حسابك أنت" };
    }
    if (parsed.data.role !== "ADMIN") {
      return { ok: false, error: "لا يمكنك تغيير دورك من مدير" };
    }
    if (useCustomPermissions && !selectedPermissions.includes("users.manage")) {
      return { ok: false, error: "لا يمكنك إزالة صلاحية إدارة الموظفين من حسابك" };
    }
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      permissionOverridesJson,
      isActive: parsed.data.isActive,
    },
  });

  // لو عُطّل الحساب، ألغِ كل جلساته فوراً.
  if (!updated.isActive) {
    await revokeAllSessions(updated.id);
  }

  await audit({
    action: "user.update",
    userId: g.id,
    entity: "User",
    entityId: updated.id,
    ip: await getClientIp(),
    details: {
      role: updated.role,
      isActive: updated.isActive,
      customPermissions: useCustomPermissions ? selectedPermissions.length : null,
    },
  });

  revalidatePath("/admin/users");
  return { ok: true, success: "تم حفظ التعديلات" };
}

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const g = await guard();
  if ("ok" in g) return g;

  const parsed = resetPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const strength = validatePasswordStrength(parsed.data.password);
  if (strength) return { ok: false, error: strength };

  const user = await prisma.user.update({
    where: { id: parsed.data.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
    select: { email: true, name: true },
  });

  // ألغِ كل الجلسات القائمة لهذا المستخدم حتى يدخل بكلمة السر الجديدة.
  await revokeAllSessions(parsed.data.id);

  await audit({
    action: "user.password_reset",
    userId: g.id,
    entity: "User",
    entityId: parsed.data.id,
    ip: await getClientIp(),
  });
  const url = appUrl();
  await sendEmail({
    to: user.email,
    subject: "تم تعيين كلمة مرور جديدة لحسابك",
    heading: "تم تحديث كلمة المرور",
    lines: [
      `مرحبًا ${user.name}`,
      `كلمة المرور الجديدة: ${parsed.data.password}`,
      "تم إنهاء جلساتك السابقة، برجاء تسجيل الدخول بكلمة المرور الجديدة.",
    ],
    actionLabel: url ? "تسجيل الدخول" : undefined,
    actionUrl: url ? `${url}/login` : undefined,
  });

  revalidatePath("/admin/users");
  return { ok: true, success: "تم تغيير كلمة المرور وإنهاء جلسات الموظف" };
}
