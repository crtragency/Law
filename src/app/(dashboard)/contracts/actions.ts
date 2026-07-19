"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { riyalsToHalalas } from "@/lib/money";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const installmentSchema = z.object({
  amount: z.number().nonnegative(),
  note: z.string().max(200).default(""),
  paid: z.boolean().default(false),
});

const contractSchema = z.object({
  id: z.string().optional(),
  number: z.string().trim().min(1, "رقم الاتفاقية مطلوب").max(60),
  clientId: z.string().min(1, "اختر الموكّل"),
  caseId: z.string().optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  dateHijri: z.string().trim().max(40).optional().or(z.literal("")),
  dateGregorian: z.string().optional().or(z.literal("")),
  scope: z.string().trim().min(3, "اكتب مهام الاتفاقية").max(6000),
  amountBeforeTax: z.number().nonnegative("المبلغ غير صحيح"),
  taxRate: z.number().min(0).max(100),
  installments: z.array(installmentSchema),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]),
});

export interface ContractInput {
  id?: string;
  number: string;
  clientId: string;
  caseId?: string;
  city?: string;
  dateHijri?: string;
  dateGregorian?: string;
  scope: string;
  amountBeforeTaxRiyals: string; // مدخل بالريال
  taxRate: number;
  installments: { amountRiyals: string; note: string; paid: boolean }[];
  notes?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export async function saveContractAction(
  input: ContractInput
): Promise<ActionResult & { id?: string }> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("contracts.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = contractSchema.safeParse({
    id: input.id,
    number: input.number,
    clientId: input.clientId,
    caseId: input.caseId ?? "",
    city: input.city ?? "",
    dateHijri: input.dateHijri ?? "",
    dateGregorian: input.dateGregorian ?? "",
    scope: input.scope,
    amountBeforeTax: riyalsToHalalas(input.amountBeforeTaxRiyals),
    taxRate: input.taxRate,
    installments: (input.installments ?? []).map((i) => ({
      amount: riyalsToHalalas(i.amountRiyals),
      note: i.note ?? "",
      paid: !!i.paid,
    })),
    notes: input.notes ?? "",
    status: input.status,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const data = {
    number: parsed.data.number,
    clientId: parsed.data.clientId,
    caseId: parsed.data.caseId || null,
    city: parsed.data.city || null,
    dateHijri: parsed.data.dateHijri || null,
    dateGregorian: parsed.data.dateGregorian
      ? new Date(parsed.data.dateGregorian)
      : null,
    scope: parsed.data.scope,
    amountBeforeTax: parsed.data.amountBeforeTax,
    taxRate: parsed.data.taxRate,
    installments: parsed.data.installments,
    notes: parsed.data.notes || null,
    status: parsed.data.status,
  };

  const ip = await getClientIp();
  let id = parsed.data.id;
  if (id) {
    await prisma.contract.update({ where: { id }, data });
    await audit({
      action: "contract.update",
      userId: actor.id,
      entity: "Contract",
      entityId: id,
      ip,
    });
  } else {
    const created = await prisma.contract.create({
      data: { ...data, createdById: actor.id },
    });
    id = created.id;
    await audit({
      action: "contract.create",
      userId: actor.id,
      entity: "Contract",
      entityId: id,
      ip,
    });
  }

  revalidatePath("/contracts");
  return { ok: true, id, success: "تم حفظ الاتفاقية" };
}

export async function deleteContractAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("contracts.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرّف غير صالح" };

  await prisma.contract.delete({ where: { id } });
  await audit({
    action: "contract.delete",
    userId: actor.id,
    entity: "Contract",
    entityId: id,
    ip: await getClientIp(),
  });

  revalidatePath("/contracts");
  redirect("/contracts");
}
