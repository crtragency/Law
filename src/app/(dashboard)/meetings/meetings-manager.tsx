"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { IconPen, IconPlus, IconTrash } from "@/components/icons";
import {
  MEETING_MINUTE_STATUS_COLORS,
  MEETING_MINUTE_STATUS_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { deleteMeetingMinuteAction, saveMeetingMinuteAction, type ActionResult } from "./actions";

const EMPTY: ActionResult = { ok: false };
const STATUSES = Object.keys(MEETING_MINUTE_STATUS_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  caseNumber: string;
}

export interface MeetingRow {
  id: string;
  title: string;
  meetingAt: string;
  location: string | null;
  attendees: string | null;
  agenda: string | null;
  decisions: string;
  actionItems: string | null;
  status: string;
  nextMeetingAt: string | null;
  clientId: string | null;
  clientName: string | null;
  caseId: string | null;
  caseTitle: string | null;
  caseNumber: string | null;
  assignedToId: string | null;
  assignedName: string | null;
  notes: string | null;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <IconPlus className="h-4 w-4" />
      {pending ? "جاري الحفظ..." : editing ? "حفظ التعديل" : "حفظ محضر"}
    </button>
  );
}

export function MeetingsManager({
  rows,
  clients,
  cases,
  users,
  canManage,
}: {
  rows: MeetingRow[];
  clients: Option[];
  cases: CaseOption[];
  users: Option[];
  canManage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<MeetingRow | null>(null);
  const [state, action] = useActionState(saveMeetingMinuteAction, EMPTY);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setEditing(null);
    }
  }, [state.ok]);

  return (
    <div className="workspace-grid">
      {canManage && (
        <form ref={formRef} action={action} className="form-panel h-fit space-y-4">
          <div className="form-heading">
            <div>
              <h2 className="form-title">{editing ? "تعديل محضر" : "محضر اجتماع"}</h2>
              <p className="form-subtitle">قرارات الاجتماع وبنود العمل تتحول لمهمة، والاجتماع القادم يظهر في التقويم.</p>
            </div>
          </div>
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input name="title" required className="field" placeholder="عنوان الاجتماع" defaultValue={editing?.title ?? ""} />
          <div className="form-grid">
            <input name="meetingAt" type="datetime-local" required className="field" defaultValue={toInputDate(editing?.meetingAt) || toInputDate(new Date().toISOString())} />
            <input name="location" className="field" placeholder="المكان أو رابط الاجتماع" defaultValue={editing?.location ?? ""} />
          </div>
          <select name="status" className="field" defaultValue={editing?.status ?? "ACTIONS_OPEN"}>
            {STATUSES.map((status) => <option key={status} value={status}>{MEETING_MINUTE_STATUS_LABELS[status]}</option>)}
          </select>
          <textarea name="attendees" rows={2} className="field" placeholder="الحضور" defaultValue={editing?.attendees ?? ""} />
          <textarea name="agenda" rows={2} className="field" placeholder="جدول الأعمال" defaultValue={editing?.agenda ?? ""} />
          <textarea name="decisions" rows={4} required className="field" placeholder="القرارات" defaultValue={editing?.decisions ?? ""} />
          <textarea name="actionItems" rows={3} className="field" placeholder="بنود العمل المطلوبة بعد الاجتماع" defaultValue={editing?.actionItems ?? ""} />
          <input name="nextMeetingAt" type="datetime-local" className="field" defaultValue={toInputDate(editing?.nextMeetingAt)} />
          <select name="clientId" className="field" defaultValue={editing?.clientId ?? ""}>
            <option value="">بدون عميل</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select name="caseId" className="field" defaultValue={editing?.caseId ?? ""}>
            <option value="">بدون قضية</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} - {item.name}</option>)}
          </select>
          <select name="assignedToId" className="field" defaultValue={editing?.assignedToId ?? ""}>
            <option value="">المسؤول عن بنود العمل</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <textarea name="notes" rows={2} className="field" placeholder="ملاحظات داخلية" defaultValue={editing?.notes ?? ""} />
          {state.error && <p className="text-sm font-semibold text-seal-600">{state.error}</p>}
          {state.success && <p className="text-sm font-semibold text-brand-700">{state.success}</p>}
          <div className="flex flex-wrap gap-2">
            <SubmitButton editing={!!editing} />
            {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); formRef.current?.reset(); }}>إلغاء التعديل</button>}
          </div>
        </form>
      )}

      <div className={canManage ? "" : "lg:col-span-2"}>
        <div className="data-panel divide-y divide-gray-100">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">لا توجد محاضر اجتماعات بعد</div>
          ) : rows.map((row) => (
            <article key={row.id} className="p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{row.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{formatDateTime(row.meetingAt)}{row.location ? ` - ${row.location}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={MEETING_MINUTE_STATUS_COLORS[row.status]}>{MEETING_MINUTE_STATUS_LABELS[row.status]}</Badge>
                  {canManage && (
                    <>
                      <button type="button" className="rounded-lg p-2 text-brand-700 hover:bg-brand-50" aria-label="تعديل" onClick={() => setEditing(row)}>
                        <IconPen className="h-4 w-4" />
                      </button>
                      <DeleteMeeting id={row.id} />
                    </>
                  )}
                </div>
              </div>
              {row.attendees && <p className="mb-2 text-xs text-gray-500">الحضور: {row.attendees}</p>}
              {row.agenda && <p className="mb-3 rounded-xl bg-gray-50 p-3 text-sm leading-7 text-gray-600">{row.agenda}</p>}
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{row.decisions}</p>
              {row.actionItems && <p className="mt-3 rounded-xl border border-brass-100 bg-brass-50/60 p-3 text-sm leading-7 text-brass-900">{row.actionItems}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                {row.clientName && <span>{row.clientName}</span>}
                {row.caseTitle && <span>{row.caseNumber} - {row.caseTitle}</span>}
                {row.assignedName && <span>المسؤول: {row.assignedName}</span>}
                {row.nextMeetingAt && <span>الاجتماع القادم: {formatDateTime(row.nextMeetingAt)}</span>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeleteMeeting({ id }: { id: string }) {
  const [, action] = useActionState(deleteMeetingMinuteAction, EMPTY);
  return (
    <form action={action} onSubmit={(event) => { if (!confirm("حذف محضر الاجتماع؟")) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}
