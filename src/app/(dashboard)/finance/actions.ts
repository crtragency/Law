"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { invoiceSchema, judicialExpenseSchema, paymentSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { computeTax, formatMoneyLabel, riyalsToHalalas } from "@/lib/money";
import { caseBelongsToClient, dateOrNow, dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, formatDate } from "@/lib/labels";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("finance.manage");
    return { id: user.id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveInvoiceAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }
  if (!(await caseBelongsToClient(parsed.data.caseId, parsed.data.clientId))) {
    return { ok: false, error: "القضية المختارة لا تخص هذا الموكّل" };
  }

  const data = {
    number: parsed.data.number,
    status: parsed.data.status,
    issueDate: dateOrNow(parsed.data.issueDate),
    dueDate: dateOrNull(parsed.data.dueDate),
    amountBeforeTax: riyalsToHalalas(parsed.data.amountBeforeTaxRiyals),
    taxRate: parsed.data.taxRate,
    notes: nullIfEmpty(parsed.data.notes),
    clientId: parsed.data.clientId,
    caseId: nullIfEmpty(parsed.data.caseId),
    contractId: nullIfEmpty(parsed.data.contractId),
  };

  const ip = await getClientIp();
  try {
    if (parsed.data.id) {
      await prisma.invoice.update({ where: { id: parsed.data.id }, data });
      await audit({ action: "invoice.update", userId: actor.id, entity: "Invoice", entityId: parsed.data.id, ip });
    } else {
      const created = await prisma.invoice.create({ data: { ...data, createdById: actor.id } });
      await audit({ action: "invoice.create", userId: actor.id, entity: "Invoice", entityId: created.id, ip });
    }
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return { ok: false, error: "رقم الفاتورة مستخدم بالفعل" };
    }
    throw e;
  }
  if (data.caseId) {
    const total = computeTax(data.amountBeforeTax, data.taxRate).total;
    await notifyClientCaseUpdate(data.caseId, {
      subject: `تحديث فاتورة: ${data.number}`,
      heading: parsed.data.id ? "تم تحديث فاتورة مرتبطة بقضيتك" : "تم إصدار فاتورة مرتبطة بقضيتك",
      lines: [
        `رقم الفاتورة: ${data.number}`,
        `الحالة: ${INVOICE_STATUS_LABELS[data.status] ?? data.status}`,
        `الإجمالي: ${formatMoneyLabel(total)}`,
        ...(data.dueDate ? [`تاريخ الاستحقاق: ${formatDate(data.dueDate)}`] : []),
      ],
    });
  }

  revalidatePath("/finance");
  return { ok: true, success: "تم حفظ الفاتورة" };
}

export async function saveInvoiceFormAction(formData: FormData): Promise<void> {
  await saveInvoiceAction(formData);
}

export async function addPaymentAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  const payment = await prisma.payment.create({
    data: {
      amount: riyalsToHalalas(parsed.data.amountRiyals),
      paidAt: dateOrNow(parsed.data.paidAt),
      method: parsed.data.method,
      reference: nullIfEmpty(parsed.data.reference),
      notes: nullIfEmpty(parsed.data.notes),
      invoiceId: nullIfEmpty(parsed.data.invoiceId),
      clientId: parsed.data.clientId,
      createdById: actor.id,
    },
  });
  await audit({ action: "payment.create", userId: actor.id, entity: "Payment", entityId: payment.id, ip: await getClientIp() });
  if (payment.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
      select: { number: true, caseId: true },
    });
    if (invoice?.caseId) {
      await notifyClientCaseUpdate(invoice.caseId, {
        subject: `تسجيل دفعة على الفاتورة: ${invoice.number}`,
        heading: "تم تسجيل دفعة مرتبطة بقضيتك",
        lines: [
          `رقم الفاتورة: ${invoice.number}`,
          `المبلغ: ${formatMoneyLabel(payment.amount)}`,
          `طريقة الدفع: ${PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}`,
          `تاريخ الدفع: ${formatDate(payment.paidAt)}`,
        ],
      });
    }
  }
  revalidatePath("/finance");
  return { ok: true, success: "تم تسجيل الدفعة" };
}

export async function addPaymentFormAction(formData: FormData): Promise<void> {
  await addPaymentAction(formData);
}

export async function saveExpenseAction(
  prevOrFormData: ActionResult | FormData,
  maybeFormData?: FormData
): Promise<ActionResult> {
  const formData = maybeFormData ?? (prevOrFormData as FormData);
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = judicialExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }
  if (!(await caseBelongsToClient(parsed.data.caseId, parsed.data.clientId))) {
    return { ok: false, error: "القضية المختارة لا تخص هذا الموكّل" };
  }

  const data = {
    title: parsed.data.title,
    category: parsed.data.category,
    status: parsed.data.status,
    amount: riyalsToHalalas(parsed.data.amountRiyals),
    incurredAt: dateOrNow(parsed.data.incurredAt),
    dueDate: dateOrNull(parsed.data.dueDate),
    paidAt: dateOrNull(parsed.data.paidAt),
    vendor: nullIfEmpty(parsed.data.vendor),
    receiptUrl: nullIfEmpty(parsed.data.receiptUrl),
    notes: nullIfEmpty(parsed.data.notes),
    clientId: nullIfEmpty(parsed.data.clientId),
    caseId: nullIfEmpty(parsed.data.caseId),
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.judicialExpense.update({ where: { id: parsed.data.id }, data });
    await audit({ action: "expense.update", userId: actor.id, entity: "JudicialExpense", entityId: parsed.data.id, ip });
  } else {
    const created = await prisma.judicialExpense.create({ data: { ...data, createdById: actor.id } });
    await audit({ action: "expense.create", userId: actor.id, entity: "JudicialExpense", entityId: created.id, ip });
  }
  revalidatePath("/finance");
  return { ok: true, success: "تم حفظ المصروف" };
}

export async function saveExpenseFormAction(formData: FormData): Promise<void> {
  await saveExpenseAction(formData);
}
