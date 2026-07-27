export default function DashboardLoading() {
  return (
    <div className="space-y-7" aria-label="جار تحميل الصفحة" aria-busy="true">
      <div className="space-y-3">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-4 w-[min(34rem,80%)]" />
        <div className="skeleton mt-5 h-1.5 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-28" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
      <div className="skeleton h-80 w-full" />
    </div>
  );
}
