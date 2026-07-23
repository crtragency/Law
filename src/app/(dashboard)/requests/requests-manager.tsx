"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/rbac";
import {
  EMPLOYEE_REQUEST_STATUS_LABELS,
  EMPLOYEE_REQUEST_TYPE_LABELS,
  employeeRequestStatusClass,
} from "@/lib/employee-requests";
import {
  cancelEmployeeRequestAction,
  createEmployeeRequestAction,
  decideEmployeeRequestAction,
  type ActionResult,
} from "./actions";

type RequestType = keyof typeof EMPLOYEE_REQUEST_TYPE_LABELS;
type RequestStatus = keyof typeof EMPLOYEE_REQUEST_STATUS_LABELS;
type RequestRow = {
  id: string;
  type: RequestType;
  status: RequestStatus;
  subject: string;
  reason: string;
  startDate: string | null;
  endDate: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  requestedById: string;
  requestedBy: {
    name: string;
    email: string;
    role: keyof typeof ROLE_LABELS;
  };
  decidedBy: { name: string } | null;
};

const EMPTY: ActionResult = { ok: false };

function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "..." : children}
    </button>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StateMessage({ state }: { state: ActionResult }) {
  if (state.error) {
    return <div className="rounded-lg border border-seal-100 bg-seal-50 px-3 py-2 text-sm font-semibold text-seal-700">{state.error}</div>;
  }
  if (state.ok && state.success) {
    return <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">{state.success}</div>;
  }
  return null;
}

export function RequestsManager({
  requests,
  currentUserId,
  canManage,
}: {
  requests: RequestRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [requestType, setRequestType] = useState<RequestType>("LEAVE");
  const [createState, createAction] = useActionState(createEmployeeRequestAction, EMPTY);
  const [decisionState, decisionAction] = useActionState(decideEmployeeRequestAction, EMPTY);
  const [cancelState, cancelAction] = useActionState(cancelEmployeeRequestAction, EMPTY);
  const pendingCount = requests.filter((request) => request.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <section className="form-panel">
        <div className="form-heading">
          <div>
            <h2 className="form-title">تقديم طلب جديد</h2>
            <p className="form-subtitle">اطلب إجازة، إذن تأخير، خروج مبكر، عمل عن بعد، أو أي طلب إداري عام.</p>
          </div>
        </div>
        <StateMessage state={createState} />
        <form action={createAction} className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="label">نوع الطلب</label>
            <select
              name="type"
              className="field"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as RequestType)}
            >
              {Object.entries(EMPLOYEE_REQUEST_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">عنوان الطلب</label>
            <input name="subject" className="field" required placeholder="مثال: إجازة يوم الأحد" />
          </div>
          <div>
            <label className="label">من تاريخ</label>
            <input name="startDate" type="date" className="field" required={requestType !== "GENERAL"} />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input name="endDate" type="date" className="field" />
          </div>
          <div className="lg:col-span-2">
            <label className="label">سبب الطلب</label>
            <textarea name="reason" className="field min-h-28" required placeholder="اكتب التفاصيل التي يحتاجها المدير للمراجعة" />
          </div>
          <div className="lg:col-span-2">
            <SubmitButton>إرسال الطلب للإدارة</SubmitButton>
          </div>
        </form>
      </section>

      <section className="data-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 className="section-title">{canManage ? "طلبات الموظفين" : "طلباتي"}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {pendingCount} طلب قيد المراجعة
            </p>
          </div>
          <StateMessage state={decisionState.ok || decisionState.error ? decisionState : cancelState} />
        </div>
        <div className="divide-y divide-gray-100">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">لا توجد طلبات حتى الآن</div>
          ) : (
            requests.map((request) => (
              <article key={request.id} className="p-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-brand-50 text-brand-800">
                        {EMPLOYEE_REQUEST_TYPE_LABELS[request.type]}
                      </Badge>
                      <Badge className={employeeRequestStatusClass(request.status)}>
                        {EMPLOYEE_REQUEST_STATUS_LABELS[request.status]}
                      </Badge>
                      <span className="text-xs text-gray-400">{formatDateTime(request.createdAt)}</span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold text-ink">{request.subject}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{request.reason}</p>
                    <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
                      <span>الموظف: <b className="text-ink">{request.requestedBy.name}</b></span>
                      <span>الدور: <b className="text-ink">{ROLE_LABELS[request.requestedBy.role]}</b></span>
                      <span>من: <b className="text-ink">{formatDate(request.startDate)}</b></span>
                      <span>إلى: <b className="text-ink">{formatDate(request.endDate)}</b></span>
                    </div>
                    {request.decisionNote && (
                      <div className="mt-3 rounded-lg border border-line bg-paper/70 px-3 py-2 text-sm text-gray-600">
                        ملاحظة القرار: {request.decisionNote}
                      </div>
                    )}
                    {request.decidedBy && (
                      <p className="mt-2 text-xs text-gray-400">
                        القرار بواسطة {request.decidedBy.name} - {formatDateTime(request.decidedAt)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {canManage && request.status === "PENDING" && (
                      <form action={decisionAction} className="rounded-lg border border-line bg-paper/60 p-3">
                        <input type="hidden" name="id" value={request.id} />
                        <label className="label">ملاحظة القرار</label>
                        <textarea name="decisionNote" className="field min-h-20" placeholder="اختياري" />
                        <div className="mt-3 flex gap-2">
                          <button type="submit" name="status" value="APPROVED" className="btn-primary flex-1">
                            موافقة
                          </button>
                          <button type="submit" name="status" value="REJECTED" className="btn-danger flex-1">
                            رفض
                          </button>
                        </div>
                      </form>
                    )}
                    {request.requestedById === currentUserId && request.status === "PENDING" && (
                      <form action={cancelAction}>
                        <input type="hidden" name="id" value={request.id} />
                        <SubmitButton className="btn-secondary w-full">إلغاء الطلب</SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
