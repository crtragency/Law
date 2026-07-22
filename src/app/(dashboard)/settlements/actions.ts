"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { riyalsToHalalas } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const settlementSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(2, "عنوان التسوية مطلوب").max(220),
  status: z.enum(["PROPOSED", "NEGOTIATING", "ACCEPTED", "REJECTED", "SIGNED", "CANCELLED"]),
  offeredBy: z.string().trim().max(180).optional().or(z.literal("")),
  amountBeforeTaxRiyals: z.string().trim().optional().or(z.literal("")),
  taxRate: z.coerce.number().int().min(0).max(100).default(15),
  terms: z.string().trim().min(3, "شروط العرض مطلوبة").max(5000),
  offerDate: z.string().optional().or(z.literal("")),
  responseDueAt: z.string().optional().or(z.literal("")),
  signedAt: z.string().optional().or(z.literal("")),
  caseId: z.string().min(1, "اختر القضية"),
  clientId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

async function guard(): Promise<{ id: string; name: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("cases.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveSettlementOfferAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = settlementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات التسوية" };
  }

  const caseInfo = await prisma.case.findUnique({
    where: { id: parsed.data.caseId },
    select: { id: true, title: true, clientId: true },
  });
  if (!caseInfo) return { ok: false, error: "القضية غير موجودة" };

  const offerDate = dateOrNull(parsed.data.offerDate) ?? new Date();
  const responseDueAt = dateOrNull(parsed.data.responseDueAt);
  const signedAt = dateOrNull(parsed.data.signedAt);
  if (parsed.data.responseDueAt && !responseDueAt) return { ok: false, error: "مهلة الرد غير صحيحة" };
  if (parsed.data.signedAt && !signedAt) return { ok: false, error: "تاريخ التوقيع غير صحيح" };

  const amountBeforeTax = parsed.data.amountBeforeTaxRiyals
    ? riyalsToHalalas(parsed.data.amountBeforeTaxRiyals)
    : null;

  const data = {
    title: parsed.data.title,
    status: parsed.data.status,
    offeredBy: nullIfEmpty(parsed.data.offeredBy),
    amountBeforeTax,
    taxRate: parsed.data.taxRate,
    terms: parsed.data.terms,
    offerDate,
    responseDueAt,
    signedAt,
    caseId: caseInfo.id,
    clientId: nullIfEmpty(parsed.data.clientId) ?? caseInfo.clientId,
    assignedToId: nullIfEmpty(parsed.data.assignedToId),
    notes: nullIfEmpty(parsed.data.notes),
  };

  const ip = await getClientIp();
  let id = parsed.data.id;
  if (id) {
    await prisma.settlementOffer.update({ where: { id }, data });
    await audit({ action: "settlement.update", userId: actor.id, entity: "SettlementOffer", entityId: id, ip });
  } else {
    const created = await prisma.settlementOffer.create({ data: { ...data, createdById: actor.id } });
    id = created.id;
    await audit({ action: "settlement.create", userId: actor.id, entity: "SettlementOffer", entityId: id, ip });
    if (responseDueAt) {
      const task = await prisma.task.create({
        data: {
          title: `متابعة رد تسوية: ${parsed.data.title}`,
          description: parsed.data.terms,
          status: "TODO",
          priority: parsed.data.status === "NEGOTIATING" ? "HIGH" : "MEDIUM",
          dueDate: responseDueAt,
          caseId: caseInfo.id,
          assignedToId: data.assignedToId ?? actor.id,
          createdById: actor.id,
        },
      });
      await prisma.settlementOffer.update({ where: { id }, data: { generatedTaskId: task.id } });
      if (task.assignedToId && task.assignedToId !== actor.id) {
        await notify({
          userId: task.assignedToId,
          type: "settlement.followup",
          title: "متابعة عرض تسوية",
          body: `${actor.name}: ${caseInfo.title}`,
          link: "/tasks",
        });
      }
    }
  }

  revalidatePath("/settlements");
  revalidatePath(`/cases/${caseInfo.id}`);
  return { ok: true, success: parsed.data.id ? "تم حفظ عرض التسوية" : "تم تسجيل عرض التسوية" };
}

export async function deleteSettlementOfferAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرف غير صالح" };
  const item = await prisma.settlementOffer.findUnique({ where: { id }, select: { caseId: true } });
  await prisma.settlementOffer.delete({ where: { id } });
  await audit({ action: "settlement.delete", userId: actor.id, entity: "SettlementOffer", entityId: id, ip: await getClientIp() });
  revalidatePath("/settlements");
  if (item?.caseId) revalidatePath(`/cases/${item.caseId}`);
  return { ok: true, success: "تم حذف عرض التسوية" };
}
