export const EMPLOYEE_REQUEST_TYPE_LABELS = {
  LEAVE: "إجازة",
  LATE_PERMISSION: "إذن تأخير",
  EARLY_LEAVE_PERMISSION: "إذن خروج مبكر",
  REMOTE_WORK: "عمل عن بعد",
  GENERAL: "طلب عام",
} as const;

export const EMPLOYEE_REQUEST_STATUS_LABELS = {
  PENDING: "قيد المراجعة",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
} as const;

export function employeeRequestStatusClass(status: keyof typeof EMPLOYEE_REQUEST_STATUS_LABELS): string {
  if (status === "APPROVED") return "bg-brand-50 text-brand-800";
  if (status === "REJECTED") return "bg-seal-50 text-seal-700";
  if (status === "CANCELLED") return "bg-gray-100 text-gray-600";
  return "bg-brass-100 text-brass-800";
}
