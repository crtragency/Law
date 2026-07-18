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
    <div className="mb-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="rule-double mt-4" aria-hidden />
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
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-gray-400">
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
    <div className="card flex items-center gap-4 transition hover:border-brand-300">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="font-display text-[26px] font-bold text-ink">
          {value}
        </div>
        <div className="mt-0.5 text-[13px] text-gray-500">{label}</div>
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
      <div className="mb-4 rounded-md border border-seal-100 bg-seal-50 px-4 py-3 text-sm text-seal-700">
        {messages[error] ?? error}
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
      {messages[success!] ?? success}
    </div>
  );
}
