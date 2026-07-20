"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import {
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_PRIORITY_LABELS,
  SERVICE_PRIORITY_COLORS,
  formatDate,
} from "@/lib/labels";
import {
  saveServiceRequestAction,
  updateServiceRequestStatusAction,
  deleteServiceRequestAction,
  type ActionResult,
} from "./actions";
import { IconPlus, IconTrash } from "@/components/icons";

const EMPTY: ActionResult = { ok: false };

const AREAS = Object.keys(SERVICE_AREA_LABELS);
const STATUSES = Object.keys(SERVICE_STATUS_LABELS);
const PRIORITIES = Object.keys(SERVICE_PRIORITY_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  clientId: string;
  caseNumber: string;
}

export interface ServiceRequestRow {
  id: string;
  title: string;
  serviceArea: string;
  status: string;
  priority: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  clientName: string | null;
  caseTitle: string | null;
  caseNumber: string | null;
  assignedToName: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <IconPlus className="h-4 w-4" /> {pending ? "جار الحفظ..." : "إضافة طلب خدمة"}
    </button>
  );
}

export function ServicesManager({
  requests,
  clients,
  cases,
  users,
  canManage,
}: {
  requests: ServiceRequestRow[];
  clients: Option[];
  cases: CaseOption[];
  users: Option[];
  canManage: boolean;
}) {
  const [state, action] = useActionState(saveServiceRequestAction, EMPTY);
  const openRequests = requests.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status)).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
      {canManage && (
        <form action={action} className="card h-fit space-y-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">طلب خدمة جديد</h2>
            <p className="mt-1 text-sm text-gray-500">
              سجّل أي خدمة قانونية أو إدارية غير مغطاة بشاشة مستقلة.
            </p>
          </div>

          <input type="hidden" name="status" value="NEW" />

          <div>
            <label className="label">عنوان الطلب</label>
            <input name="title" required className="field" placeholder="مثال: مراجعة وكالة عميل جديد" />
          </div>

          <div>
            <label className="label">نوع الخدمة</label>
            <select name="serviceArea" required className="field">
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {SERVICE_AREA_LABELS[area]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">الأولوية</label>
              <select name="priority" className="field" defaultValue="MEDIUM">
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {SERVICE_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاريخ الاستحقاق</label>
              <input name="dueDate" type="date" className="field" />
            </div>
          </div>

          <div>
            <label className="label">الموكّل</label>
            <select name="clientId" className="field" defaultValue="">
              <option value="">بدون موكّل محدد</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">القضية</label>
            <select name="caseId" className="field" defaultValue="">
              <option value="">بدون قضية محددة</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">الموظف المسؤول</label>
            <select name="assignedToId" className="field" defaultValue="">
              <option value="">غير مُسند</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">الوصف</label>
            <textarea
              name="description"
              rows={4}
              className="field"
              placeholder="اكتب المطلوب، الجهة، المستندات، أو الخطوة التالية..."
            />
          </div>

          {state.error && <p className="text-sm text-seal-600">{state.error}</p>}
          {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
          <SubmitButton />
        </form>
      )}

      <div className={canManage ? "" : "lg:col-span-2"}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">طلبات الخدمات</h2>
            <p className="mt-1 text-sm text-gray-500">
              {requests.length} طلب مسجل، منها {openRequests} مفتوحة.
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="card py-12 text-center text-sm text-gray-500">
            لا توجد طلبات خدمات بعد
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-line bg-paper/60">
                <tr>
                  <th className="table-th">الطلب</th>
                  <th className="table-th">الخدمة</th>
                  <th className="table-th">الأولوية</th>
                  <th className="table-th">الموكّل / القضية</th>
                  <th className="table-th">المسؤول</th>
                  <th className="table-th">الاستحقاق</th>
                  <th className="table-th">الحالة</th>
                  {canManage && <th className="table-th">إجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium text-gray-800">{request.title}</div>
                      {request.description && (
                        <p className="mt-1 line-clamp-2 max-w-[260px] text-xs text-gray-500">
                          {request.description}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        أُنشئ في {formatDate(request.createdAt)}
                      </p>
                    </td>
                    <td className="table-td">{SERVICE_AREA_LABELS[request.serviceArea]}</td>
                    <td className="table-td">
                      <Badge className={SERVICE_PRIORITY_COLORS[request.priority]}>
                        {SERVICE_PRIORITY_LABELS[request.priority]}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <div>{request.clientName ?? "—"}</div>
                      {request.caseTitle && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {request.caseNumber} — {request.caseTitle}
                        </p>
                      )}
                    </td>
                    <td className="table-td">{request.assignedToName ?? "غير مُسند"}</td>
                    <td className="table-td text-xs text-gray-500">
                      {request.dueDate ? formatDate(request.dueDate) : "—"}
                    </td>
                    <td className="table-td">
                      <Badge className={SERVICE_STATUS_COLORS[request.status]}>
                        {SERVICE_STATUS_LABELS[request.status]}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <StatusForm id={request.id} currentStatus={request.status} />
                          <DeleteForm id={request.id} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [, action] = useActionState(updateServiceRequestStatusAction, EMPTY);
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <select name="status" className="field h-9 w-36 py-1 text-xs" defaultValue={currentStatus}>
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {SERVICE_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">
        حفظ
      </button>
    </form>
  );
}

function DeleteForm({ id }: { id: string }) {
  const [, action] = useActionState(deleteServiceRequestAction, EMPTY);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("حذف طلب الخدمة؟")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-md p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}