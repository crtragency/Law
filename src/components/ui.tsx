import Link from "next/link";

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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
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
  icon = "📭",
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
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
  icon: string;
  href?: string;
}) {
  const inner = (
    <div className="card flex items-center gap-4 transition hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
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
      <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {messages[error] ?? error}
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
      {messages[success!] ?? success}
    </div>
  );
}
