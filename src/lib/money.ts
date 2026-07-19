// أدوات التعامل مع المبالغ — تُخزَّن بالهللة (Int) لتفادي أخطاء الكسور العشرية.
// 1 ريال = 100 هللة.

/** تحويل نص ريالات (قد يحوي كسوراً) إلى هللات صحيحة. */
export function riyalsToHalalas(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** تنسيق مبلغ بالهللة إلى نص بالريال مع الفواصل. */
export function formatMoney(halalas: number): string {
  const riyals = halalas / 100;
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(riyals);
}

/** تنسيق مبلغ مع كلمة "ريال". */
export function formatMoneyLabel(halalas: number): string {
  return `${formatMoney(halalas)} ريال`;
}

/** حساب الضريبة والإجمالي من مبلغ قبل الضريبة (بالهللة). */
export function computeTax(amountBeforeTax: number, taxRate: number) {
  const tax = Math.round((amountBeforeTax * taxRate) / 100);
  return {
    beforeTax: amountBeforeTax,
    tax,
    total: amountBeforeTax + tax,
  };
}

export interface InstallmentInput {
  amount: number; // بالهللة
  note: string;
  paid: boolean;
}

/** التحقق من صحة مصفوفة الدفعات القادمة من قاعدة البيانات (Json). */
export function parseInstallments(value: unknown): InstallmentInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      amount: typeof x.amount === "number" ? x.amount : 0,
      note: typeof x.note === "string" ? x.note : "",
      paid: x.paid === true,
    }));
}
