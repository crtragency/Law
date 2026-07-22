"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { IconPen, IconPlus, IconTrash } from "@/components/icons";
import {
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DIRECTION_LABELS,
  COMMUNICATION_OUTCOME_COLORS,
  COMMUNICATION_OUTCOME_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { deleteCommunicationAction, saveCommunicationAction, type ActionResult } from "./actions";

const EMPTY: ActionResult = { ok: false };
const DIRECTIONS = Object.keys(COMMUNICATION_DIRECTION_LABELS);
const CHANNELS = Object.keys(COMMUNICATION_CHANNEL_LABELS);
const OUTCOMES = Object.keys(COMMUNICATION_OUTCOME_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  caseNumber: string;
  clientId: string;
}

export interface CommunicationRow {
  id: string;
  subject: string;
  direction: string;
  channel: string;
  outcome: string;
  summary: string;
  contactName: string | null;
  contactInfo: string | null;
  occurredAt: string;
  nextFollowUpAt: string | null;
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
      {pending ? "جاري الحفظ..." : editing ? "حفظ التعديل" : "تسجيل التواصل"}
    </button>
  );
}

export function CommunicationsManager({
  rows,
  clients,
  cases,
  users,
  canManage,
}: {
  rows: CommunicationRow[];
  clients: Option[];
  cases: CaseOption[];
  users: Option[];
  canManage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<CommunicationRow | null>(null);
  const [state, action] = useActionState(saveCommunicationAction, EMPTY);

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
              <h2 className="form-title">{editing ? "تعديل تواصل" : "تواصل جديد"}</h2>
              <p className="form-subtitle">سجل المكالمة أو الإيميل أو الواتساب، وحدد متابعة لو محتاج إجراء بعده.</p>
            </div>
          </div>
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input name="subject" required className="field" placeholder="عنوان التواصل" defaultValue={editing?.subject ?? ""} />
          <div className="form-grid">
            <select name="direction" className="field" defaultValue={editing?.direction ?? "INBOUND"}>
              {DIRECTIONS.map((item) => (
                <option key={item} value={item}>{COMMUNICATION_DIRECTION_LABELS[item]}</option>
              ))}
            </select>
            <select name="channel" className="field" defaultValue={editing?.channel ?? "PHONE"}>
              {CHANNELS.map((item) => (
                <option key={item} value={item}>{COMMUNICATION_CHANNEL_LABELS[item]}</option>
              ))}
            </select>
          </div>
          <div className="form-grid">
            <select name="outcome" className="field" defaultValue={editing?.outcome ?? "LOGGED"}>
              {OUTCOMES.map((item) => (
                <option key={item} value={item}>{COMMUNICATION_OUTCOME_LABELS[item]}</option>
              ))}
            </select>
            <input name="occurredAt" type="datetime-local" required className="field" defaultValue={toInputDate(editing?.occurredAt) || toInputDate(new Date().toISOString())} />
          </div>
          <div className="form-grid">
            <input name="contactName" className="field" placeholder="اسم الطرف" defaultValue={editing?.contactName ?? ""} />
            <input name="contactInfo" className="field" placeholder="رقم/إيميل الطرف" defaultValue={editing?.contactInfo ?? ""} dir="ltr" />
          </div>
          <select name="clientId" className="field" defaultValue={editing?.clientId ?? ""}>
            <option value="">بدون عميل</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select name="caseId" className="field" defaultValue={editing?.caseId ?? ""}>
            <option value="">بدون قضية</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>{item.caseNumber} - {item.name}</option>
            ))}
          </select>
          <select name="assignedToId" className="field" defaultValue={editing?.assignedToId ?? ""}>
            <option value="">الموظف المسؤول عن المتابعة</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <textarea name="summary" rows={4} required className="field" placeholder="ملخص ما تم الاتفاق عليه أو ما قيل..." defaultValue={editing?.summary ?? ""} />
          <div className="form-grid">
            <input name="nextFollowUpAt" type="datetime-local" className="field" defaultValue={toInputDate(editing?.nextFollowUpAt)} />
            <input name="notes" className="field" placeholder="ملاحظات داخلية" defaultValue={editing?.notes ?? ""} />
          </div>
          {state.error && <p className="text-sm font-semibold text-seal-600">{state.error}</p>}
          {state.success && <p className="text-sm font-semibold text-brand-700">{state.success}</p>}
          <div className="flex flex-wrap gap-2">
            <SubmitButton editing={!!editing} />
            {editing && (
              <button type="button" className="btn-secondary" onClick={() => { setEditing(null); formRef.current?.reset(); }}>
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      )}

      <div className={canManage ? "" : "lg:col-span-2"}>
        <div className="data-panel overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">لا توجد تواصلات مسجلة بعد</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map((row) => (
                <article key={row.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink">{row.subject}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(row.occurredAt)} - {COMMUNICATION_CHANNEL_LABELS[row.channel]} - {COMMUNICATION_DIRECTION_LABELS[row.direction]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={COMMUNICATION_OUTCOME_COLORS[row.outcome]}>{COMMUNICATION_OUTCOME_LABELS[row.outcome]}</Badge>
                      {canManage && (
                        <>
                          <button type="button" className="rounded-lg p-2 text-brand-700 hover:bg-brand-50" aria-label="تعديل" onClick={() => setEditing(row)}>
                            <IconPen className="h-4 w-4" />
                          </button>
                          <DeleteCommunication id={row.id} />
                        </>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{row.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {row.contactName && <span>{row.contactName}</span>}
                    {row.contactInfo && <span dir="ltr">{row.contactInfo}</span>}
                    {row.clientName && <span>{row.clientName}</span>}
                    {row.caseTitle && <span>{row.caseNumber} - {row.caseTitle}</span>}
                    {row.assignedName && <span>المسؤول: {row.assignedName}</span>}
                    {row.nextFollowUpAt && <span>المتابعة: {formatDateTime(row.nextFollowUpAt)}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteCommunication({ id }: { id: string }) {
  const [, action] = useActionState(deleteCommunicationAction, EMPTY);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("حذف سجل التواصل؟")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}
