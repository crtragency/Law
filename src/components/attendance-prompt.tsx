import { IconClock } from "@/components/icons";
import {
  formatAttendanceTime,
  formatDuration,
  getDateKey,
  summarizeAttendance,
} from "@/lib/attendance";
import { clockInAction, clockOutAction } from "@/app/(dashboard)/attendance/actions";

type AttendancePromptRecord = {
  userId: string;
  workDate: Date;
  clockInAt: Date | null;
  clockOutAt: Date | null;
} | null;

export function AttendancePrompt({ record }: { record: AttendancePromptRecord }) {
  const todayKey = getDateKey();
  const summary = summarizeAttendance(record, todayKey);

  if (record?.clockInAt && record.clockOutAt) return null;

  const isWorking = Boolean(record?.clockInAt);

  if (!isWorking) {
    return (
      <div
        className="fixed inset-0 z-[120] grid place-items-center bg-brand-950/72 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-required-title"
      >
        <section className="w-full max-w-[460px] overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_32px_90px_rgba(7,24,18,0.32)]">
          <div className="bg-[linear-gradient(135deg,#0c201a_0%,#1f4e3e_68%,#8a6a28_100%)] p-6 text-white">
            <span className="mb-5 grid h-14 w-14 place-items-center rounded-lg border border-white/18 bg-white/12 text-brass-200">
              <IconClock className="h-7 w-7" />
            </span>
            <h2 id="attendance-required-title" className="font-display text-2xl font-bold">
              تسجيل الحضور مطلوب
            </h2>
            <p className="mt-3 text-sm leading-7 text-brand-100">
              قبل ما تبدأ استخدام لوحة المكتب، سجّل بداية ساعات العمل لهذا اليوم. التسجيل ده هيتحسب في شيت الحضور والانصراف.
            </p>
          </div>
          <div className="p-5">
            <div className="mb-4 rounded-lg border border-line bg-paper/70 px-4 py-3 text-sm leading-7 text-gray-600">
              بداية الدوام الافتراضية 9:00 صباحًا، والسماح بالتأخير 15 دقيقة.
            </div>
            <form action={clockInAction}>
              <button type="submit" className="btn-primary w-full">
                <IconClock className="h-4 w-4" />
                بداية العمل وتسجيل الحضور
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-brand-100 bg-white shadow-sm shadow-brand-950/[0.035]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <IconClock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">يوم العمل شغال الآن</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              بدأت اليوم الساعة {formatAttendanceTime(record?.clockInAt)}
              {summary.lateMinutes > 0 ? `، والتأخير المسجل ${formatDuration(summary.lateMinutes)}` : ""}.
            </p>
          </div>
        </div>
        <form action={clockOutAction} className="shrink-0">
          <button type="submit" className="btn-secondary">
            <IconClock className="h-4 w-4" />
            تسجيل الانصراف
          </button>
        </form>
      </div>
    </section>
  );
}
