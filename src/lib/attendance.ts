import type { Role } from "@prisma/client";

export const ATTENDANCE_TIMEZONE = "Africa/Cairo";
export const ATTENDANCE_SETTINGS = {
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  graceMinutes: 15,
  maxReportDays: 62,
};

export type AttendanceUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type AttendanceRecordSnapshot = {
  userId: string;
  workDate: Date;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  notes?: string | null;
};

export type AttendanceSummary = {
  statusLabel: string;
  tone: "good" | "warning" | "danger" | "muted";
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number | null;
  expectedStartAt: Date;
  expectedEndAt: Date;
};

export type AttendanceReportRow = {
  dateKey: string;
  user: AttendanceUser;
  record: AttendanceRecordSnapshot | null;
  summary: AttendanceSummary;
};

function getDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getDateKey(date = new Date()): string {
  const { year, month, day } = getDateParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function workDateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function getCurrentWorkDate(date = new Date()): Date {
  return workDateFromKey(getDateKey(date));
}

export function dateKeyFromWorkDate(workDate: Date): string {
  return workDate.toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = workDateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultAttendanceRange(today = new Date()) {
  const endKey = getDateKey(today);
  return {
    startKey: addDaysToDateKey(endKey, -6),
    endKey,
  };
}

export function parseDateKey(value: string | null | undefined, fallback: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback;
}

export function normalizeDateRange(startKey: string, endKey: string) {
  let start = startKey;
  let end = endKey;
  if (start > end) [start, end] = [end, start];
  const maxEnd = addDaysToDateKey(start, ATTENDANCE_SETTINGS.maxReportDays - 1);
  if (end > maxEnd) end = maxEnd;
  return { startKey: start, endKey: end };
}

export function dateKeysBetween(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  for (let key = startKey; key <= endKey; key = addDaysToDateKey(key, 1)) {
    keys.push(key);
  }
  return keys;
}

function timeZoneOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDANCE_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return Math.round((localAsUtc - date.getTime()) / 60000);
}

export function zonedDateTimeToUtc(dateKey: string, hour: number, minute = 0): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = timeZoneOffsetMinutes(utcGuess);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset * 60000);
}

function minutesBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000));
}

export function summarizeAttendance(
  record: AttendanceRecordSnapshot | null,
  dateKey: string,
  now = new Date()
): AttendanceSummary {
  const expectedStartAt = zonedDateTimeToUtc(
    dateKey,
    ATTENDANCE_SETTINGS.startHour,
    ATTENDANCE_SETTINGS.startMinute
  );
  const expectedEndAt = zonedDateTimeToUtc(
    dateKey,
    ATTENDANCE_SETTINGS.endHour,
    ATTENDANCE_SETTINGS.endMinute
  );
  const todayKey = getDateKey(now);

  if (dateKey > todayKey) {
    return {
      statusLabel: "لم يحن اليوم",
      tone: "muted",
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedMinutes: null,
      expectedStartAt,
      expectedEndAt,
    };
  }

  if (!record?.clockInAt) {
    return {
      statusLabel: "لم يسجل حضور",
      tone: "danger",
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workedMinutes: null,
      expectedStartAt,
      expectedEndAt,
    };
  }

  const rawLateMinutes = minutesBetween(record.clockInAt, expectedStartAt);
  const lateMinutes = rawLateMinutes > ATTENDANCE_SETTINGS.graceMinutes ? rawLateMinutes : 0;
  const earlyLeaveMinutes = record.clockOutAt && record.clockOutAt < expectedEndAt
    ? minutesBetween(expectedEndAt, record.clockOutAt)
    : 0;
  const workedMinutes = record.clockOutAt
    ? Math.max(0, Math.round((record.clockOutAt.getTime() - record.clockInAt.getTime()) / 60000))
    : null;

  if (!record.clockOutAt) {
    return {
      statusLabel: "حاضر الآن",
      tone: lateMinutes > 0 ? "warning" : "good",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      expectedStartAt,
      expectedEndAt,
    };
  }

  if (lateMinutes > 0 && earlyLeaveMinutes > 0) {
    return {
      statusLabel: "تأخير وانصراف مبكر",
      tone: "danger",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      expectedStartAt,
      expectedEndAt,
    };
  }

  if (lateMinutes > 0) {
    return {
      statusLabel: "متأخر",
      tone: "warning",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      expectedStartAt,
      expectedEndAt,
    };
  }

  if (earlyLeaveMinutes > 0) {
    return {
      statusLabel: "انصراف مبكر",
      tone: "warning",
      lateMinutes,
      earlyLeaveMinutes,
      workedMinutes,
      expectedStartAt,
      expectedEndAt,
    };
  }

  return {
    statusLabel: "منتظم",
    tone: "good",
    lateMinutes,
    earlyLeaveMinutes,
    workedMinutes,
    expectedStartAt,
    expectedEndAt,
  };
}

export function buildAttendanceRows({
  users,
  records,
  dateKeys,
}: {
  users: AttendanceUser[];
  records: AttendanceRecordSnapshot[];
  dateKeys: string[];
}): AttendanceReportRow[] {
  const byUserDate = new Map(
    records.map((record) => [`${record.userId}:${dateKeyFromWorkDate(record.workDate)}`, record])
  );

  return dateKeys.flatMap((dateKey) =>
    users.map((user) => {
      const record = byUserDate.get(`${user.id}:${dateKey}`) ?? null;
      return {
        dateKey,
        user,
        record,
        summary: summarizeAttendance(record, dateKey),
      };
    })
  );
}

export function formatAttendanceTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: ATTENDANCE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAttendanceDate(dateKey: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(workDateFromKey(dateKey));
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes <= 0) return "0د";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}د`;
  if (rest === 0) return `${hours}س`;
  return `${hours}س ${rest}د`;
}

export function attendanceToneClass(tone: AttendanceSummary["tone"]): string {
  if (tone === "good") return "bg-brand-50 text-brand-800";
  if (tone === "warning") return "bg-brass-100 text-brass-800";
  if (tone === "danger") return "bg-seal-50 text-seal-700";
  return "bg-gray-100 text-gray-600";
}
