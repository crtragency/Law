import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge } from "@/components/ui";
import {
  LITIGATION_STAGE_LABELS,
  LITIGATION_STEP_STATUS_COLORS,
  LITIGATION_STEP_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { deleteLitigationStepFormAction, saveLitigationStepFormAction } from "./actions";
import { IconPlus, IconTrash } from "@/components/icons";

export const metadata = { title: "إجراءات التقاضي — نظام مكتب المحاماة" };

const STAGES = Object.keys(LITIGATION_STAGE_LABELS);
const STATUSES = Object.keys(LITIGATION_STEP_STATUS_LABELS);
const PRIORITIES = Object.keys(TASK_PRIORITY_LABELS);

export default async function LitigationPage() {
  const user = await requirePermission("litigation.view");
  const canManage = hasPermission(user.role, "litigation.manage");

  const [steps, cases, users] = await Promise.all([
    prisma.litigationStep.findMany({
      orderBy: [{ dueDate: "asc" }, { sessionDate: "asc" }, { createdAt: "desc" }],
      include: {
        case: { select: { title: true, caseNumber: true, client: { select: { name: true } } } },
        assignedTo: { select: { name: true } },
      },
      take: 200,
    }),
    prisma.case.findMany({
      where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
      take: 200,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="إجراءات التقاضي"
        subtitle="مراحل القضية، الجلسات، الأحكام، الإجراء التالي، والمسؤول"
      />

      <div className="workspace-grid">
        {canManage && (
          <form action={saveLitigationStepFormAction} className="form-panel h-fit space-y-4">
            <div className="form-heading">
              <div>
                <h2 className="form-title">إجراء جديد</h2>
                <p className="form-subtitle">سجل جلسة، حكم، مذكرة، مهلة، أو إجراء متابعة للقضية.</p>
              </div>
            </div>
            <input name="title" required className="field" placeholder="مثال: إعداد مذكرة الرد" />
            <select name="caseId" required className="field" defaultValue="">
              <option value="">اختر القضية</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>
              ))}
            </select>
            <div className="form-grid">
              <select name="stage" className="field" defaultValue="OTHER">
                {STAGES.map((stage) => <option key={stage} value={stage}>{LITIGATION_STAGE_LABELS[stage]}</option>)}
              </select>
              <select name="status" className="field" defaultValue="PLANNED">
                {STATUSES.map((status) => <option key={status} value={status}>{LITIGATION_STEP_STATUS_LABELS[status]}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <select name="priority" className="field" defaultValue="MEDIUM">
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>)}
              </select>
              <select name="assignedToId" className="field" defaultValue="">
                <option value="">غير مُسند</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <input name="court" className="field" placeholder="المحكمة" />
              <input name="circuit" className="field" placeholder="الدائرة" />
            </div>
            <div className="form-grid">
              <input name="sessionDate" type="datetime-local" className="field" />
              <input name="dueDate" type="date" className="field" />
            </div>
            <textarea name="outcome" rows={2} className="field" placeholder="النتيجة / الحكم / القرار" />
            <textarea name="nextAction" rows={2} className="field" placeholder="الإجراء التالي" />
            <textarea name="notes" rows={2} className="field" placeholder="ملاحظات" />
            <button type="submit" className="btn-primary"><IconPlus className="h-4 w-4" /> إضافة إجراء</button>
          </form>
        )}

        <div className={canManage ? "" : "lg:col-span-2"}>
          <div className="data-panel overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-line bg-paper/60">
                <tr>
                  <th className="table-th">الإجراء</th>
                  <th className="table-th">القضية</th>
                  <th className="table-th">المرحلة</th>
                  <th className="table-th">المواعيد</th>
                  <th className="table-th">المسؤول</th>
                  <th className="table-th">الحالة</th>
                  {canManage && <th className="table-th">إجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {steps.length === 0 ? (
                  <tr><td colSpan={canManage ? 7 : 6} className="p-8 text-center text-sm text-gray-500">لا توجد إجراءات تقاضي بعد</td></tr>
                ) : steps.map((step) => (
                  <tr key={step.id} className="align-top hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium text-gray-800">{step.title}</div>
                      {step.nextAction && <p className="mt-1 text-xs text-gray-500">{step.nextAction}</p>}
                    </td>
                    <td className="table-td text-xs text-gray-600">
                      {step.case.caseNumber} — {step.case.title}
                      <div className="text-gray-400">{step.case.client.name}</div>
                    </td>
                    <td className="table-td">{LITIGATION_STAGE_LABELS[step.stage]}</td>
                    <td className="table-td text-xs text-gray-500">
                      <div>جلسة: {formatDateTime(step.sessionDate)}</div>
                      <div>مهلة: {formatDate(step.dueDate)}</div>
                    </td>
                    <td className="table-td">{step.assignedTo?.name ?? "—"}</td>
                    <td className="table-td"><Badge className={LITIGATION_STEP_STATUS_COLORS[step.status]}>{LITIGATION_STEP_STATUS_LABELS[step.status]}</Badge></td>
                    {canManage && (
                      <td className="table-td">
                        <form action={deleteLitigationStepFormAction}>
                          <input type="hidden" name="id" value={step.id} />
                          <button type="submit" className="rounded-md p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف"><IconTrash className="h-4 w-4" /></button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
