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
  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-brand-100 bg-white shadow-sm shadow-brand-950/[0.035]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <IconClock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              {isWorking ? "يوم العمل شغال الآن" : "ابدأ ساعات عملك"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              {isWorking
                ? `بدأت اليوم الساعة ${formatAttendanceTime(record?.clockInAt)}${
                    summary.lateMinutes > 0 ? `، والتأخير المسجل ${formatDuration(summary.lateMinutes)}` : ""
                  }.`
                : "اضغط بداية العمل لتسجيل حضورك لهذا اليوم داخل النظام."}
            </p>
          </div>
        </div>
        <form action={isWorking ? clockOutAction : clockInAction} className="shrink-0">
          <button type="submit" className={isWorking ? "btn-secondary" : "btn-primary"}>
            <IconClock className="h-4 w-4" />
            {isWorking ? "تسجيل الانصراف" : "بداية العمل"}
          </button>
        </form>
      </div>
    </section>
  );
}
