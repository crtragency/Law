import Link from "next/link";
import { IconInbox } from "@/components/icons";

/**
 * ترويسة الصفحة — تحمل توقيع الهوية: السطر المزدوج (سطر ثخين يليه رفيع)
 * المأخوذ من تقاليد السجلات والمستندات الرسمية.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-4xl">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="mt-2 max-w-3xl text-[13px] leading-7 text-gray-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="rule-double mt-5" aria-hidden />
    </div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="card flex min-h-[220px] flex-col items-center justify-center border-dashed py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-paper text-gray-400">
        {icon ?? <IconInbox />}
      </div>
      <p className="font-medium text-gray-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="card surface-hover group flex min-h-[112px] items-center gap-4 overflow-hidden p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition duration-200 group-hover:bg-brand-700 group-hover:text-white">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="font-display text-[27px] font-bold text-ink">
          {value}
        </div>
        <div className="mt-1 text-[12px] font-semibold leading-5 text-gray-500">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** رسالة نجاح/خطأ تُقرأ من searchParams. */
export function FlashMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;
  const messages: Record<string, string> = {
    forbidden: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
    created: "تمت الإضافة بنجاح",
    updated: "تم الحفظ بنجاح",
    deleted: "تم الحذف بنجاح",
  };
  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-seal-100 bg-seal-50 px-4 py-3 text-sm font-semibold text-seal-700 shadow-sm shadow-seal-800/[0.04]">
        {messages[error] ?? error}
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 shadow-sm shadow-brand-900/[0.04]">
      {messages[success!] ?? success}
    </div>
  );
}
