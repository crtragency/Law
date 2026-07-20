import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge } from "@/components/ui";
import { POWER_STATUS_COLORS, POWER_STATUS_LABELS, formatDate } from "@/lib/labels";
import { deletePowerFormAction, savePowerFormAction } from "./actions";
import { IconPlus, IconTrash } from "@/components/icons";

export const metadata = { title: "التوكيلات — نظام مكتب المحاماة" };

const STATUSES = ["ACTIVE", "EXPIRING", "EXPIRED", "REVOKED", "ARCHIVED"];

export default async function PowersPage() {
  const user = await requirePermission("powers.view");
  const canManage = hasPermission(user.role, "powers.manage");

  const [powers, clients, cases] = await Promise.all([
    prisma.powerOfAttorney.findMany({
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { name: true, companyName: true, type: true } },
        case: { select: { title: true, caseNumber: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, type: true },
    }),
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
      take: 200,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="التوكيلات والتفويضات"
        subtitle="متابعة الوكالات السارية والمنتهية وتنبيهات التجديد"
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {canManage && (
          <form action={savePowerFormAction} className="card h-fit space-y-3">
            <h2 className="font-display text-lg font-bold">وكالة جديدة</h2>
            <input name="number" required className="field" placeholder="رقم الوكالة" />
            <input name="title" required className="field" placeholder="عنوان الوكالة" />
            <select name="status" className="field" defaultValue="ACTIVE">
              {STATUSES.map((status) => (
                <option key={status} value={status}>{POWER_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <select name="clientId" required className="field" defaultValue="">
              <option value="">اختر الموكّل</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.type === "COMPANY" && client.companyName ? client.companyName : client.name}
                </option>
              ))}
            </select>
            <select name="caseId" className="field" defaultValue="">
              <option value="">بدون قضية</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="issuedAt" type="date" className="field" />
              <input name="expiresAt" type="date" className="field" />
            </div>
            <input name="issuer" className="field" placeholder="مصدر الوكالة" />
            <input name="representative" className="field" placeholder="الممثل/الوكيل" />
            <input name="documentUrl" className="field" placeholder="رابط المستند" dir="ltr" />
            <textarea name="scope" rows={3} className="field" placeholder="نطاق الصلاحيات" />
            <textarea name="notes" rows={2} className="field" placeholder="ملاحظات" />
            <button type="submit" className="btn-primary">
              <IconPlus className="h-4 w-4" /> إضافة وكالة
            </button>
          </form>
        )}

        <div className={canManage ? "" : "lg:col-span-2"}>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-line bg-paper/60">
                <tr>
                  <th className="table-th">الوكالة</th>
                  <th className="table-th">الموكّل</th>
                  <th className="table-th">القضية</th>
                  <th className="table-th">الانتهاء</th>
                  <th className="table-th">الحالة</th>
                  {canManage && <th className="table-th">إجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {powers.length === 0 ? (
                  <tr><td colSpan={canManage ? 6 : 5} className="p-8 text-center text-sm text-gray-500">لا توجد وكالات بعد</td></tr>
                ) : powers.map((power) => {
                  const clientName = power.client.type === "COMPANY" && power.client.companyName ? power.client.companyName : power.client.name;
                  return (
                    <tr key={power.id} className="hover:bg-gray-50">
                      <td className="table-td">
                        <div className="font-medium text-gray-800">{power.title}</div>
                        <div className="text-xs text-gray-400" dir="ltr">{power.number}</div>
                        {power.documentUrl && <a href={power.documentUrl} target="_blank" className="text-xs text-brand-700 hover:underline">فتح المستند</a>}
                      </td>
                      <td className="table-td">{clientName}</td>
                      <td className="table-td text-xs text-gray-500">{power.case ? `${power.case.caseNumber} — ${power.case.title}` : "—"}</td>
                      <td className="table-td text-xs text-gray-500">{formatDate(power.expiresAt)}</td>
                      <td className="table-td"><Badge className={POWER_STATUS_COLORS[power.status]}>{POWER_STATUS_LABELS[power.status]}</Badge></td>
                      {canManage && (
                        <td className="table-td">
                          <form action={deletePowerFormAction}>
                            <input type="hidden" name="id" value={power.id} />
                            <button type="submit" className="rounded-md p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف"><IconTrash className="h-4 w-4" /></button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
