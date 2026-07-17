import "server-only";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { getSessionUser } from "@/lib/session";
import { hasPermission, type Permission } from "@/lib/rbac";

/**
 * يتطلب مستخدماً مسجَّل الدخول. يعيد التوجيه لصفحة الدخول إن لم يكن.
 * تُستخدم في Server Components و Server Actions.
 */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** يتطلب صلاحية معيّنة، وإلا يعيد التوجيه للوحة التحكم. */
export async function requirePermission(
  permission: Permission
): Promise<User> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}

/** يتطلب دوراً معيّناً (أو أعلى). */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}

/**
 * نسخة لا تعيد التوجيه — تُستخدم في Server Actions للتحقق وإرجاع خطأ.
 * ترمي استثناءً يمكن التقاطه.
 */
export async function ensurePermission(
  permission: Permission
): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("يجب تسجيل الدخول");
  }
  if (!hasPermission(user.role, permission)) {
    throw new AuthError("ليس لديك صلاحية لهذا الإجراء");
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
