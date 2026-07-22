"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { IconPen, IconPlus, IconTrash } from "@/components/icons";
import {
  CORRESPONDENCE_DIRECTION_LABELS,
  CORRESPONDENCE_IMPORTANCE_LABELS,
  CORRESPONDENCE_STATUS_COLORS,
  CORRESPONDENCE_STATUS_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { deleteCorrespondenceAction, saveCorrespondenceAction, type ActionResult } from "./actions";

const EMPTY: ActionResult = { ok: false };
const DIRECTIONS = Object.keys(CORRESPONDENCE_DIRECTION_LABELS);
const STATUSES = Object.keys(CORRESPONDENCE_STATUS_LABELS);
const IMPORTANCE = Object.keys(CORRESPONDENCE_IMPORTANCE_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  caseNumber: string;
}

export interface CorrespondenceRow {
  id: string;
  number: string;
  title: string;
  direction: string;
  status: string;
  importance: string;
  sender: string | null;
  recipient: string | null;
  deliveryMethod: string | null;
  referenceNumber: string | null;
  summary: string | null;
  attachmentUrl: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  dueAt: string | null;
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
      {pending ? "جاري الحفظ..." : editing ? "حفظ التعديل" : "قيد مراسلة"}
    </button>
  );
}

export function CorrespondenceManager({
  rows,
  clients,
  cases,
  users,
  suggestedNumber,
  canManage,
}: {
  rows: CorrespondenceRow[];
  clients: Option[];
  cases: CaseOption[];
  users: Option[];
  suggestedNumber: string;
  canManage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<CorrespondenceRow | null>(null);
  const [state, action] = useActionState(saveCorrespondenceAction, EMPTY);

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
              <h2 className="form-title">{editing ? "تعديل مراسلة" : "قيد وارد/صادر"}</h2>
              <p className="form-subtitle">رقم قيد موحد، حالة، جهة الإرسال والاستلام، وموعد رد يتحول لمهمة عند الحاجة.</p>
            </div>
          </div>
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="form-grid">
            <input name="number" required className="field" placeholder="رقم القيد" defaultValue={editing?.number ?? suggestedNumber} />
            <input name="title" required className="field" placeholder="عنوان المراسلة" defaultValue={editing?.title ?? ""} />
          </div>
          <div className="form-grid">
            <select name="direction" className="field" defaultValue={editing?.direction ?? "INCOMING"}>
              {DIRECTIONS.map((item) => <option key={item} value={item}>{CORRESPONDENCE_DIRECTION_LABELS[item]}</option>)}
            </select>
            <select name="status" className="field" defaultValue={editing?.status ?? "REGISTERED"}>
              {STATUSES.map((item) => <option key={item} value={item}>{CORRESPONDENCE_STATUS_LABELS[item]}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <select name="importance" className="field" defaultValue={editing?.importance ?? "NORMAL"}>
              {IMPORTANCE.map((item) => <option key={item} value={item}>{CORRESPONDENCE_IMPORTANCE_LABELS[item]}</option>)}
            </select>
            <input name="referenceNumber" className="field" placeholder="رقم مرجع خارجي" defaultValue={editing?.referenceNumber ?? ""} />
          </div>
          <div className="form-grid">
            <input name="sender" className="field" placeholder="المرسل" defaultValue={editing?.sender ?? ""} />
            <input name="recipient" className="field" placeholder="المستلم" defaultValue={editing?.recipient ?? ""} />
          </div>
          <div className="form-grid">
            <input name="deliveryMethod" className="field" placeholder="طريقة التسليم" defaultValue={editing?.deliveryMethod ?? ""} />
            <input name="attachmentUrl" className="field" placeholder="رابط المرفق أو المرجع" defaultValue={editing?.attachmentUrl ?? ""} dir="ltr" />
          </div>
          <div className="form-grid">
            <input name="receivedAt" type="datetime-local" className="field" defaultValue={toInputDate(editing?.receivedAt)} />
            <input name="sentAt" type="datetime-local" className="field" defaultValue={toInputDate(editing?.sentAt)} />
          </div>
          <input name="dueAt" type="datetime-local" className="field" defaultValue={toInputDate(editing?.dueAt)} />
          <select name="clientId" className="field" defaultValue={editing?.clientId ?? ""}>
            <option value="">بدون عميل</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select name="caseId" className="field" defaultValue={editing?.caseId ?? ""}>
            <option value="">بدون قضية</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} - {item.name}</option>)}
          </select>
          <select name="assignedToId" className="field" defaultValue={editing?.assignedToId ?? ""}>
            <option value="">المسؤول عن الرد أو المتابعة</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <textarea name="summary" rows={3} className="field" placeholder="ملخص المراسلة" defaultValue={editing?.summary ?? ""} />
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
        <div className="data-panel overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line bg-paper/60">
              <tr>
                <th className="table-th">القيد</th>
                <th className="table-th">النوع والحالة</th>
                <th className="table-th">الأطراف</th>
                <th className="table-th">الارتباط</th>
                <th className="table-th">المواعيد</th>
                {canManage && <th className="table-th">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={canManage ? 6 : 5} className="p-8 text-center text-sm text-gray-500">لا توجد مراسلات مسجلة بعد</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-gray-50">
                  <td className="table-td">
                    <div className="font-semibold text-ink">{row.number}</div>
                    <div className="mt-1 text-xs text-gray-500">{row.title}</div>
                    {row.referenceNumber && <div className="mt-1 text-xs text-gray-400">مرجع: {row.referenceNumber}</div>}
                  </td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-gray-100 text-gray-700">{CORRESPONDENCE_DIRECTION_LABELS[row.direction]}</Badge>
                      <Badge className={CORRESPONDENCE_STATUS_COLORS[row.status]}>{CORRESPONDENCE_STATUS_LABELS[row.status]}</Badge>
                      <Badge className={row.importance === "URGENT" ? "bg-seal-50 text-seal-700" : row.importance === "IMPORTANT" ? "bg-brass-50 text-brass-800" : "bg-gray-100 text-gray-600"}>{CORRESPONDENCE_IMPORTANCE_LABELS[row.importance]}</Badge>
                    </div>
                  </td>
                  <td className="table-td text-xs text-gray-600">
                    <div>من: {row.sender ?? "—"}</div>
                    <div>إلى: {row.recipient ?? "—"}</div>
                    {row.deliveryMethod && <div>{row.deliveryMethod}</div>}
                  </td>
                  <td className="table-td text-xs text-gray-600">
                    <div>{row.clientName ?? "—"}</div>
                    {row.caseTitle && <div>{row.caseNumber} - {row.caseTitle}</div>}
                    {row.assignedName && <div>المسؤول: {row.assignedName}</div>}
                  </td>
                  <td className="table-td text-xs text-gray-600">
                    {row.receivedAt && <div>استلام: {formatDateTime(row.receivedAt)}</div>}
                    {row.sentAt && <div>إرسال: {formatDateTime(row.sentAt)}</div>}
                    {row.dueAt && <div className="font-semibold text-brass-800">رد: {formatDateTime(row.dueAt)}</div>}
                  </td>
                  {canManage && (
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button type="button" className="rounded-lg p-2 text-brand-700 hover:bg-brand-50" aria-label="تعديل" onClick={() => setEditing(row)}>
                          <IconPen className="h-4 w-4" />
                        </button>
                        <DeleteCorrespondence id={row.id} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeleteCorrespondence({ id }: { id: string }) {
  const [, action] = useActionState(deleteCorrespondenceAction, EMPTY);
  return (
    <form action={action} onSubmit={(event) => { if (!confirm("حذف المراسلة؟")) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}
