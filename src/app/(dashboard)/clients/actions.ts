"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { clientSchema } from "@/lib/validation";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { revokeClientSessions } from "@/lib/portal-session";
import { sendEmail, appUrl } from "@/lib/email";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export async function saveClientAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };

  let actor;
  try {
    actor = await ensurePermission("clients.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = clientSchema.safeParse({
    id: formData.get("id") || undefined,
    type: formData.get("type") || "INDIVIDUAL",
    name: formData.get("name"),
    nationalId: formData.get("nationalId") ?? "",
    nationality: formData.get("nationality") ?? "",
    companyName: formData.get("companyName") ?? "",
    unifiedNumber: formData.get("unifiedNumber") ?? "",
    taxNumber: formData.get("taxNumber") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    type: parsed.data.type,
    name: parsed.data.name,
    nationalId: parsed.data.nationalId || null,
    nationality: parsed.data.nationality || null,
    companyName: parsed.data.type === "COMPANY" ? parsed.data.companyName || null : null,
    unifiedNumber: parsed.data.type === "COMPANY" ? parsed.data.unifiedNumber || null : null,
    taxNumber: parsed.data.type === "COMPANY" ? parsed.data.taxNumber || null : null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null,
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.client.update({ where: { id: parsed.data.id }, data });
    await audit({
      action: "client.update",
      userId: actor.id,
      entity: "Client",
      entityId: parsed.data.id,
      ip,
    });
  } else {
    const created = await prisma.client.create({
      data: { ...data, createdById: actor.id },
    });
    await audit({
      action: "client.create",
      userId: actor.id,
      entity: "Client",
      entityId: created.id,
      ip,
    });
  }

  revalidatePath("/clients");
  return { ok: true, success: parsed.data.id ? "تم حفظ التعديلات" : "تمت إضافة الموكّل" };
}

// ===========================================================================
//  إدارة بوابة العميل — تفعيل الدخول وتعيين كلمة المرور
// ===========================================================================

const portalSchema = z.object({
  clientId: z.string().min(1),
  enabled: z.boolean(),
  portalEmail: z.string().trim().toLowerCase().email("بريد غير صحيح").optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  sendWelcome: z.boolean().default(false),
});

export async function setClientPortalAction(input: {
  clientId: string;
  enabled: boolean;
  portalEmail?: string;
  password?: string;
  sendWelcome?: boolean;
}): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("clients.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = portalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });
  if (!client) return { ok: false, error: "الموكّل غير موجود" };

  const data: {
    portalEnabled: boolean;
    portalEmail?: string | null;
    portalPasswordHash?: string;
  } = { portalEnabled: parsed.data.enabled };

  if (parsed.data.enabled) {
    if (!parsed.data.portalEmail) {
      return { ok: false, error: "أدخل بريد الدخول للعميل" };
    }
    // تأكد أن البريد غير مستخدم لعميل آخر.
    const conflict = await prisma.client.findFirst({
      where: { portalEmail: parsed.data.portalEmail, id: { not: client.id } },
      select: { id: true },
    });
    if (conflict) {
      return { ok: false, error: "هذا البريد مستخدم لعميل آخر" };
    }
    data.portalEmail = parsed.data.portalEmail;

    // كلمة مرور جديدة (مطلوبة عند أول تفعيل).
    if (parsed.data.password) {
      const strength = validatePasswordStrength(parsed.data.password);
      if (strength) return { ok: false, error: strength };
      data.portalPasswordHash = await hashPassword(parsed.data.password);
    } else if (!client.portalPasswordHash) {
      return { ok: false, error: "عيّن كلمة مرور للعميل" };
    }
  }

  await prisma.client.update({ where: { id: client.id }, data });

  // عند التعطيل أو تغيير كلمة المرور، ألغِ كل جلسات العميل.
  if (!parsed.data.enabled || data.portalPasswordHash) {
    await revokeClientSessions(client.id);
  }

  await audit({
    action: parsed.data.enabled ? "client.portal.enable" : "client.portal.disable",
    userId: actor.id,
    entity: "Client",
    entityId: client.id,
    ip: await getClientIp(),
  });

  // رسالة ترحيب بالبريد (بدون كلمة المرور — تُبلّغ للعميل من المكتب).
  if (parsed.data.enabled && parsed.data.sendWelcome && data.portalEmail) {
    const url = appUrl();
    await sendEmail({
      to: data.portalEmail,
      subject: "تم تفعيل حسابك في بوابة العميل",
      heading: "مرحباً بك في بوابة العميل",
      lines: [
        `تم تفعيل حساب خاص بك لمتابعة قضاياك ومستنداتك ومواعيد الجلسات.`,
        `بريد الدخول: ${data.portalEmail}`,
        `كلمة المرور تم تزويدك بها من المكتب.`,
      ],
      actionLabel: url ? "الدخول إلى البوابة" : undefined,
      actionUrl: url ? `${url}/portal/login` : undefined,
    });
  }

  revalidatePath("/clients");
  return {
    ok: true,
    success: parsed.data.enabled ? "تم تفعيل بوابة العميل" : "تم تعطيل بوابة العميل",
  };
}

export async function deleteClientAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };

  let actor;
  try {
    actor = await ensurePermission("clients.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  // لا نحذف موكّلاً له قضايا (حماية للبيانات).
  const caseCount = await prisma.case.count({ where: { clientId: id } });
  if (caseCount > 0) {
    return {
      ok: false,
      error: "لا يمكن حذف موكّل مرتبط بقضايا. احذف قضاياه أولاً أو أرشفها",
    };
  }

  await prisma.client.delete({ where: { id } });
  await audit({
    action: "client.delete",
    userId: actor.id,
    entity: "Client",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/clients");
  return { ok: true, success: "تم حذف الموكّل" };
}
