"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveEventAction,
  deleteEventAction,
  type ActionResult,
} from "./actions";
import { Badge } from "@/components/ui";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  formatDateTime,
} from "@/lib/labels";

const EMPTY: ActionResult = { ok: false };
const TYPES = ["HEARING", "MEETING", "DEADLINE", "APPOINTMENT", "OTHER"] as const;

interface Option {
  id: string;
  name: string;
}
interface EventItem {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  notes: string | null;
  caseId: string | null;
  caseTitle: string | null;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export function CalendarView({
  upcoming,
  past,
  cases,
  canManage,
}: {
  upcoming: EventItem[];
  past: EventItem[];
  cases: Option[];
  canManage: boolean;
}) {
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button onClick={() => setShowNew((v) => !v)} className="btn-primary">
            {showNew ? "إخفاء" : "➕ موعد / جلسة"}
          </button>
        )}
        <div className="flex rounded-lg border border-gray-300 p-0.5">
          <button
            onClick={() => setTab("upcoming")}
            className={`rounded-md px-3 py-1 text-sm ${
              tab === "upcoming" ? "bg-brand-600 text-white" : "text-gray-600"
            }`}
          >
            القادمة ({upcoming.length})
          </button>
          <button
            onClick={() => setTab("past")}
            className={`rounded-md px-3 py-1 text-sm ${
              tab === "past" ? "bg-brand-600 text-white" : "text-gray-600"
            }`}
          >
            السابقة ({past.length})
          </button>
        </div>
      </div>

      {showNew && canManage && (
        <EventForm cases={cases} onDone={() => setShowNew(false)} />
      )}

      {list.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          لا توجد مواعيد
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((ev) => (
            <div key={ev.id} className="card flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {ev.type === "HEARING" ? "⚖️" : ev.type === "DEADLINE" ? "⏳" : "📌"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{ev.title}</span>
                    <Badge className={EVENT_TYPE_COLORS[ev.type]}>
                      {EVENT_TYPE_LABELS[ev.type]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    🕐 {formatDateTime(ev.startAt)}
                    {ev.endAt && ` — ${formatDateTime(ev.endAt)}`}
                  </p>
                  {ev.location && (
                    <p className="text-sm text-gray-500">📍 {ev.location}</p>
                  )}
                  {ev.caseTitle && (
                    <p className="text-sm text-gray-500">📁 {ev.caseTitle}</p>
                  )}
                  {ev.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                      {ev.notes}
                    </p>
                  )}
                </div>
              </div>
              {canManage && <DeleteEvent id={ev.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventForm({ cases, onDone }: { cases: Option[]; onDone: () => void }) {
  const [state, action] = useActionState(saveEventAction, EMPTY);
  useEffect(() => {
    if (state.ok && state.success) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
  }, [state, onDone]);

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-bold">موعد / جلسة جديدة</h3>
      {state.error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && state.success && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </div>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">العنوان *</label>
          <input name="title" required className="field" />
        </div>
        <div>
          <label className="label">النوع</label>
          <select name="type" className="field" defaultValue="HEARING">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">القضية المرتبطة</label>
          <select name="caseId" className="field" defaultValue="">
            <option value="">— لا شيء —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">التاريخ والوقت *</label>
          <input
            name="startAt"
            type="datetime-local"
            required
            className="field"
            dir="ltr"
          />
        </div>
        <div>
          <label className="label">وقت الانتهاء (اختياري)</label>
          <input name="endAt" type="datetime-local" className="field" dir="ltr" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">المكان</label>
          <input name="location" className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">ملاحظات</label>
          <textarea name="notes" rows={2} className="field" />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <Submit label="إضافة" />
          <button type="button" onClick={onDone} className="btn-secondary">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteEvent({ id }: { id: string }) {
  const [, action] = useActionState(deleteEventAction, EMPTY);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("حذف هذا الموعد؟")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:underline"
      >
        حذف
      </button>
    </form>
  );
}
