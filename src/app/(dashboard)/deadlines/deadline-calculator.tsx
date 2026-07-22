"use client";

import { useMemo, useState } from "react";
import { IconCalendar, IconClock } from "@/components/icons";

const presets = [
  { id: "appeal-30", label: "استئناف / اعتراض 30 يوم", days: 30 },
  { id: "memo-15", label: "مذكرة أو رد 15 يوم", days: 15 },
  { id: "notice-10", label: "إشعار أو إنذار 10 أيام", days: 10 },
  { id: "urgent-5", label: "مهلة عاجلة 5 أيام", days: 5 },
  { id: "custom", label: "مدة مخصصة", days: 0 },
];

function parseLocalDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isWorkday(date: Date) {
  const day = date.getDay();
  return day !== 5 && day !== 6;
}

function addCalendarDays(start: Date, days: number) {
  const date = new Date(start);
  date.setDate(date.getDate() + days);
  return date;
}

function addWorkDays(start: Date, days: number) {
  const date = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (isWorkday(date)) remaining -= 1;
  }
  return date;
}

function format(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function DeadlineCalculator() {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [preset, setPreset] = useState("appeal-30");
  const [customDays, setCustomDays] = useState("30");
  const [workdays, setWorkdays] = useState(false);

  const result = useMemo(() => {
    const base = parseLocalDate(startDate);
    const selected = presets.find((item) => item.id === preset) ?? presets[0];
    const days = selected.id === "custom" ? Number(customDays) : selected.days;
    if (!base || !Number.isFinite(days) || days <= 0) return null;
    const finalDate = workdays ? addWorkDays(base, days) : addCalendarDays(base, days);
    const reminders = [7, 3, 1]
      .filter((offset) => days > offset)
      .map((offset) => ({ offset, date: addCalendarDays(finalDate, -offset) }));
    return { base, days, finalDate, reminders };
  }, [customDays, preset, startDate, workdays]);

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(420px,520px)_1fr]">
      <section className="form-panel h-fit space-y-4">
        <div className="form-heading">
          <div>
            <h2 className="form-title">بيانات المدة</h2>
            <p className="form-subtitle">اختار تاريخ البداية ونوع المدة. الحساب داخلي بدون أي خدمة خارجية.</p>
          </div>
        </div>
        <div>
          <label className="label">تاريخ البداية</label>
          <input type="date" className="field" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div>
          <label className="label">نوع المدة</label>
          <select className="field" value={preset} onChange={(event) => setPreset(event.target.value)}>
            {presets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {preset === "custom" && (
          <div>
            <label className="label">عدد الأيام</label>
            <input
              type="number"
              min={1}
              max={1000}
              className="field"
              value={customDays}
              onChange={(event) => setCustomDays(event.target.value)}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
          <input type="checkbox" checked={workdays} onChange={(event) => setWorkdays(event.target.checked)} />
          احتساب أيام عمل فقط
        </label>
      </section>

      <section className="data-panel p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <IconClock />
          </div>
          <div>
            <h2 className="section-title">نتيجة الحاسبة</h2>
            <p className="mt-1 text-sm text-gray-500">راجع النتيجة مع نوع الإجراء قبل الاعتماد النهائي.</p>
          </div>
        </div>

        {!result ? (
          <p className="rounded-2xl border border-line bg-paper/70 p-5 text-sm text-gray-500">
            أدخل تاريخاً وعدد أيام صحيحين.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
              <p className="text-xs font-bold text-brand-700">آخر موعد</p>
              <p className="mt-2 font-display text-3xl font-bold text-ink">{format(result.finalDate)}</p>
              <p className="mt-2 text-sm text-brand-900">
                مدة {result.days} يوم من {format(result.base)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {result.reminders.map((item) => (
                <div key={item.offset} className="rounded-2xl border border-line bg-white p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-brand-700">
                    <IconCalendar className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">قبل {item.offset} يوم</p>
                  <p className="mt-1 text-sm font-bold text-ink">{format(item.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
