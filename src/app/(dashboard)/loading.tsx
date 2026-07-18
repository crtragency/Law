/**
 * هيكل تحميل فوري: يظهر لحظة الضغط على أي رابط بينما يجهّز الخادم الصفحة،
 * فيشعر المستخدم أن التنقل لحظي بدل شاشة متجمدة.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="جارٍ التحميل">
      {/* ترويسة الصفحة */}
      <div className="mb-7">
        <div className="h-7 w-44 rounded bg-gray-200" />
        <div className="mt-2.5 h-4 w-64 rounded bg-gray-100" />
        <div className="mt-5 border-t-2 border-gray-200" />
      </div>

      {/* بطاقات إحصائية */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className="h-11 w-11 rounded-md bg-gray-100" />
            <div className="flex-1">
              <div className="h-5 w-12 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>

      {/* محتوى */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100" />
              <div className="flex-1">
                <div className="h-4 w-3/5 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-2/5 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="card space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-1/3 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-14 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
