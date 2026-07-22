"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { IconPlus, IconTrash } from "@/components/icons";
import {
  DOCUMENT_REQUEST_STATUS_COLORS,
  DOCUMENT_REQUEST_STATUS_LABELS,
  formatDate,
} from "@/lib/labels";
import {
  createDocumentRequestCenterAction,
  deleteDocumentRequestCenterAction,
  updateDocumentRequestCenterStatusAction,
  type ActionResult,
} from "./actions";

const EMPTY: ActionResult = { ok: false };
const STATUSES = Object.keys(DOCUMENT_REQUEST_STATUS_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  caseNumber: string;
}

export interface DocumentRequestRow {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  caseId: string;
  caseTitle: string;
  caseNumber: string;
  clientName: string;
  createdByName: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <IconPlus className="h-4 w-4" />
      {pending ? "جاري الطلب..." : "طلب مستند"}
    </button>
  );
}

export function DocumentRequestsManager({
  rows,
  cases,
  users,
  canManage,
}: {
  rows: DocumentRequestRow[];
  cases: CaseOption[];
  users: Option[];
  canManage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createDocumentRequestCenterAction, EMPTY);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="workspace-grid">
      {canManage && (
        <form ref={formRef} action={action} className="form-panel h-fit space-y-4">
          <div className="form-heading">
            <div>
              <h2 className="form-title">طلب مستند من عميل</h2>
              <p className="form-subtitle">اختر القضية واكتب المطلوب، وسيصل تنبيه للعميل ويتولد تذكير متابعة للموظف.</p>
            </div>
          </div>
          <select name="caseId" required className="field" defaultValue="">
            <option value="">اختر القضية</option>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} - {item.name}</option>)}
          </select>
          <input name="title" required className="field" placeholder="اسم المستند المطلوب" />
          <div className="form-grid">
            <input name="category" className="field" placeholder="التصنيف" />
            <input name="dueDate" type="date" className="field" />
          </div>
          <select name="assignedToId" className="field" defaultValue="">
            <option value="">المسؤول عن المتابعة</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <textarea name="description" rows={4} className="field" placeholder="تفاصيل أو صيغة الرسالة للعميل" />
          {state.error && <p className="text-sm font-semibold text-seal-600">{state.error}</p>}
          {state.success && <p className="text-sm font-semibold text-brand-700">{state.success}</p>}
          <SubmitButton />
        </form>
      )}

      <div className={canManage ? "" : "lg:col-span-2"}>
        <div className="data-panel overflow-x-auto">
          <table className="w-full min-w-[940px]">
            <thead className="border-b border-line bg-paper/60">
              <tr>
                <th className="table-th">المستند</th>
                <th className="table-th">القضية والعميل</th>
                <th className="table-th">المواعيد</th>
                <th className="table-th">الحالة</th>
                {canManage && <th className="table-th">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={canManage ? 5 : 4} className="p-8 text-center text-sm text-gray-500">لا توجد طلبات مستندات بعد</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-gray-50">
                  <td className="table-td">
                    <div className="font-semibold text-ink">{row.title}</div>
                    <div className="mt-1 text-xs text-gray-500">{row.category ?? "بدون تصنيف"}</div>
                    {row.description && <p className="mt-2 max-w-md text-xs leading-6 text-gray-500">{row.description}</p>}
                  </td>
                  <td className="table-td text-xs text-gray-600">
                    <div className="font-medium text-gray-800">{row.caseNumber} - {row.caseTitle}</div>
                    <div>{row.clientName}</div>
                  </td>
                  <td className="table-td text-xs text-gray-600">
                    <div>الطلب: {formatDate(row.createdAt)}</div>
                    {row.dueDate && <div className="font-semibold text-brass-800">الاستحقاق: {formatDate(row.dueDate)}</div>}
                    {row.createdByName && <div>منشئ الطلب: {row.createdByName}</div>}
                  </td>
                  <td className="table-td">
                    {canManage ? (
                      <StatusForm id={row.id} caseId={row.caseId} status={row.status} />
                    ) : (
                      <Badge className={DOCUMENT_REQUEST_STATUS_COLORS[row.status]}>{DOCUMENT_REQUEST_STATUS_LABELS[row.status]}</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="table-td">
                      <DeleteRequest id={row.id} />
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

function StatusForm({ id, caseId, status }: { id: string; caseId: string; status: string }) {
  const [, action] = useActionState(updateDocumentRequestCenterStatusAction, EMPTY);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="caseId" value={caseId} />
      <select name="status" className="field min-w-[150px]" defaultValue={status} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        {STATUSES.map((item) => <option key={item} value={item}>{DOCUMENT_REQUEST_STATUS_LABELS[item]}</option>)}
      </select>
    </form>
  );
}

function DeleteRequest({ id }: { id: string }) {
  const [, action] = useActionState(deleteDocumentRequestCenterAction, EMPTY);
  return (
    <form action={action} onSubmit={(event) => { if (!confirm("حذف طلب المستند؟")) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}
