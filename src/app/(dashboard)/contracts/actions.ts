"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import {
  computeTax,
  formatMoneyLabel,
  parseInstallments,
  riyalsToHalalas,
} from "@/lib/money";
import {
  notifyClientCaseUpdate,
  notifyClientContractUpdate,
} from "@/lib/client-notify";
import { CONTRACT_STATUS_LABELS, formatDate } from "@/lib/labels";

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

const CONTRACT_STATUSES = [
  "DRAFT",
  "SENT",
  "CLIENT_SIGNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

type ContractStatusInput = (typeof CONTRACT_STATUSES)[number];

const contractSchema = z
  .object({
    id: z.string().optional(),
    number: z.string().trim().min(1, "رقم الاتفاقية مطلوب").max(60),
    clientId: z.string().min(1, "اختر الموكّل"),
    caseId: z.string().optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    dateHijri: z.string().trim().max(40).optional().or(z.literal("")),
    dateGregorian: z.string().optional().or(z.literal("")),
    scope: z.string().trim().max(6000),
    amountBeforeTax: z.number().nonnegative("المبلغ غير صحيح"),
    taxRate: z.number().min(0).max(100),
    installments: z.array(installmentSchema),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    status: z.enum(CONTRACT_STATUSES),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "DRAFT" && data.scope.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scope"],
        message: "اكتب مهام الاتفاقية قبل إرسالها أو اعتمادها",
      });
    }
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
  status: ContractStatusInput;
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
  if (data.caseId && data.status !== "DRAFT") {
    const total = computeTax(data.amountBeforeTax, data.taxRate).total;
    await notifyClientCaseUpdate(data.caseId, {
      subject: `تحديث اتفاقية أتعاب: ${data.number}`,
      heading: parsed.data.id ? "تم تحديث اتفاقية مرتبطة بقضيتك" : "تم إنشاء اتفاقية مرتبطة بقضيتك",
      lines: [
        `رقم الاتفاقية: ${data.number}`,
        `الحالة: ${CONTRACT_STATUS_LABELS[data.status] ?? data.status}`,
        `الإجمالي: ${formatMoneyLabel(total)}`,
        ...(data.dateGregorian ? [`تاريخ الاتفاقية: ${formatDate(data.dateGregorian)}`] : []),
      ],
    });
  }

  revalidatePath("/contracts");
  return { ok: true, id, success: "تم حفظ الاتفاقية" };
}

export async function updateContractStatusAction(
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
  const status = String(formData.get("status") ?? "");
  const parsed = z.object({
    id: z.string().min(1),
    status: z.enum(CONTRACT_STATUSES),
  }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "بيانات تغيير الحالة غير صحيحة" };

  const contract = await prisma.contract.findUnique({
    where: { id: parsed.data.id },
    include: {
      case: { select: { id: true, title: true, caseNumber: true } },
    },
  });
  if (!contract) return { ok: false, error: "الاتفاقية غير موجودة" };

  const nextStatus = parsed.data.status;
  const { beforeTax, tax, total } = computeTax(contract.amountBeforeTax, contract.taxRate);
  const installments = parseInstallments(contract.installments);
  const allocated = installments.reduce((sum, installment) => sum + installment.amount, 0);

  if (["SENT", "CLIENT_SIGNED", "ACTIVE"].includes(nextStatus)) {
    if (contract.scope.trim().length < 3) {
      return { ok: false, error: "اكتب مهام الاتفاقية قبل إرسالها للعميل" };
    }
    if (contract.amountBeforeTax <= 0) {
      return { ok: false, error: "أدخل الأتعاب قبل الضريبة قبل إرسال الاتفاقية" };
    }
    if (installments.length === 0 || allocated !== total) {
      return {
        ok: false,
        error: "إجمالي الدفعات يجب أن يساوي الإجمالي شامل الضريبة",
      };
    }
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: nextStatus },
  });
  await audit({
    action: "contract.status",
    userId: actor.id,
    entity: "Contract",
    entityId: contract.id,
    ip: await getClientIp(),
    details: { from: contract.status, to: nextStatus },
  });

  if (nextStatus === "SENT") {
    await notifyClientContractUpdate(contract.id, {
      subject: `اتفاقية أتعاب للتوقيع: ${contract.number}`,
      heading: "تم إرسال اتفاقية أتعاب للتوقيع",
      actionLabel: "عرض وتوقيع الاتفاقية",
      lines: [
        `رقم الاتفاقية: ${contract.number}`,
        `الأتعاب قبل الضريبة: ${formatMoneyLabel(beforeTax)}`,
        `ضريبة القيمة المضافة (${contract.taxRate}%): ${formatMoneyLabel(tax)}`,
        `الإجمالي شامل الضريبة: ${formatMoneyLabel(total)}`,
        "يمكن توقيع الاتفاقية ورقياً أو إلكترونياً من بوابة العميل عند توفر الدخول.",
      ],
    });
  }

  if (nextStatus === "ACTIVE") {
    await notifyClientContractUpdate(contract.id, {
      subject: `تم اعتماد اتفاقية الأتعاب: ${contract.number}`,
      heading: "تم اعتماد اتفاقية الأتعاب وأصبحت سارية",
      lines: [
        `رقم الاتفاقية: ${contract.number}`,
        `الحالة: ${CONTRACT_STATUS_LABELS[nextStatus]}`,
        `الإجمالي شامل الضريبة: ${formatMoneyLabel(total)}`,
      ],
    });
  }

  if (contract.caseId) {
    await notifyClientCaseUpdate(contract.caseId, {
      subject: `تحديث اتفاقية أتعاب: ${contract.number}`,
      heading: "تم تحديث حالة اتفاقية أتعاب مرتبطة بقضيتك",
      lines: [
        `رقم الاتفاقية: ${contract.number}`,
        `الحالة: ${CONTRACT_STATUS_LABELS[nextStatus] ?? nextStatus}`,
        `القضية: ${contract.case?.title ?? contract.case?.caseNumber ?? ""}`,
      ],
    });
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contract.id}`);
  revalidatePath("/portal");
  revalidatePath(`/portal/contracts/${contract.id}`);
  if (contract.caseId) revalidatePath(`/portal/cases/${contract.caseId}`);

  return {
    ok: true,
    success: `تم تحديث حالة الاتفاقية إلى ${CONTRACT_STATUS_LABELS[nextStatus] ?? nextStatus}`,
  };
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
