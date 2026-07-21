import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Badge, PageHeader } from "@/components/ui";
import {
  APPROVAL_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPE_LABELS,
  formatDateTime,
} from "@/lib/labels";
import {
  createApprovalRequestFormAction,
  decideApprovalRequestFormAction,
} from "./actions";

export const metadata = { title: "الموافقات — نظام مكتب المحاماة" };
export const dynamic = "force-dynamic";

const TYPES = Object.keys(APPROVAL_TYPE_LABELS);

export default async function ApprovalsPage() {
  const user = await requirePermission("approvals.view");
  const canManage = hasPermission(user.role, "approvals.manage");

  const [pending, recent] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: canManage ? { status: "PENDING" } : { status: "PENDING", requestedById: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        requestedBy: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
      take: 50,
    }),
    prisma.approvalRequest.findMany({
      where: canManage
        ? { status: { not: "PENDING" } }
        : { requestedById: user.id, status: { not: "PENDING" } },
      orderBy: { updatedAt: "desc" },
      include: {
        requestedBy: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموافقات الداخلية"
        subtitle="اعتماد العقود، إظهار المستندات، الحذف، والتعديلات المالية الحساسة"
      />

      <form action={createApprovalRequestFormAction} className="form-panel space-y-4">
        <h2 className="form-title">طلب موافقة جديد</h2>
        <div className="form-grid">
          <input name="title" required className="field" placeholder="عنوان طلب الموافقة" />
          <select name="type" className="field" defaultValue="GENERAL">
            {TYPES.map((type) => (
              <option key={type} value={type}>{APPROVAL_TYPE_LABELS[type]}</option>
            ))}
          </select>
          <input name="entityType" className="field" placeholder="نوع العنصر: Contract / Document / Invoice" dir="ltr" />
          <input name="entityId" className="field" placeholder="معرّف العنصر" dir="ltr" />
          <textarea
            name="reason"
            rows={3}
            className="field sm:col-span-2"
            placeholder="سبب طلب الموافقة أو تفاصيل القرار المطلوب..."
          />
        </div>
        <button type="submit" className="btn-primary">إرسال طلب الموافقة</button>
      </form>

      <section className="data-panel">
        <div className="border-b border-line p-5">
          <h2 className="section-title">الطلبات المعلقة</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {pending.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">لا توجد طلبات موافقة معلقة</p>
          ) : pending.map((request) => (
            <ApprovalRow key={request.id} request={request} canManage={canManage} />
          ))}
        </div>
      </section>

      <section className="data-panel">
        <div className="border-b border-line p-5">
          <h2 className="section-title">سجل الموافقات</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">لا توجد قرارات محفوظة بعد</p>
          ) : recent.map((request) => (
            <ApprovalRow key={request.id} request={request} canManage={false} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ApprovalRow({
  request,
  canManage,
}: {
  request: {
    id: string;
    title: string;
    type: string;
    status: string;
    entityType: string | null;
    entityId: string | null;
    reason: string | null;
    decisionNote: string | null;
    createdAt: Date;
    decidedAt: Date | null;
    requestedBy: { name: string } | null;
    decidedBy: { name: string } | null;
  };
  canManage: boolean;
}) {
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">{request.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {APPROVAL_TYPE_LABELS[request.type] ?? request.type} — بواسطة {request.requestedBy?.name ?? "—"} — {formatDateTime(request.createdAt)}
          </p>
          {(request.entityType || request.entityId) && (
            <p className="mt-1 text-xs text-gray-400" dir="ltr">
              {request.entityType ?? "Entity"} / {request.entityId ?? "—"}
            </p>
          )}
        </div>
        <Badge className={APPROVAL_STATUS_COLORS[request.status] ?? "bg-gray-100 text-gray-600"}>
          {APPROVAL_STATUS_LABELS[request.status] ?? request.status}
        </Badge>
      </div>
      {request.reason && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">{request.reason}</p>}
      {request.decisionNote && (
        <p className="mt-3 rounded-lg bg-paper p-3 text-sm leading-7 text-gray-600">
          {request.decisionNote}
        </p>
      )}
      {request.decidedBy && (
        <p className="mt-2 text-xs text-gray-400">
          القرار بواسطة {request.decidedBy.name} — {formatDateTime(request.decidedAt)}
        </p>
      )}
      {canManage && request.status === "PENDING" && (
        <form action={decideApprovalRequestFormAction} className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
          <input type="hidden" name="id" value={request.id} />
          <select name="status" className="field" defaultValue="APPROVED">
            <option value="APPROVED">اعتماد</option>
            <option value="REJECTED">رفض</option>
            <option value="CANCELLED">إلغاء</option>
          </select>
          <input name="decisionNote" className="field" placeholder="ملاحظة القرار" />
          <button type="submit" className="btn-primary">حفظ القرار</button>
        </form>
      )}
    </div>
  );
}
