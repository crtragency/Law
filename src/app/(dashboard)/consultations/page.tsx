import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  CONSULTATION_PRIORITY_COLORS,
  CONSULTATION_PRIORITY_LABELS,
  CONSULTATION_SOURCE_LABELS,
  CONSULTATION_STATUS_COLORS,
  CONSULTATION_STATUS_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { IconCheck, IconMessage, IconPlus, IconUser } from "@/components/icons";
import {
  deleteConsultationFormAction,
  saveConsultationFormAction,
} from "./actions";

export const metadata = { title: "الاستشارات — نظام مكتب المحاماة" };

const statuses = Object.keys(CONSULTATION_STATUS_LABELS);
const priorities = Object.keys(CONSULTATION_PRIORITY_LABELS);
const sources = Object.keys(CONSULTATION_SOURCE_LABELS);

function displayClient(client: { name: string; companyName?: string | null; type?: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

export default async function ConsultationsPage() {
  const user = await requirePermission("consultations.view");
  const canManage = hasPermission(user, "consultations.manage");

  const [consultations, clients, cases, users] = await Promise.all([
    prisma.legalConsultation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, companyName: true, type: true } },
        case: { select: { id: true, title: true, caseNumber: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, type: true },
    }),
    prisma.case.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, caseNumber: true, clientId: true },
      take: 200,
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "LAWYER", "PARALEGAL"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const waiting = consultations.filter((item) => item.status === "NEW").length;
  const inReview = consultations.filter((item) => item.status === "IN_REVIEW").length;
  const ready = consultations.filter((item) => item.status === "OPINION_READY").length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="الاستشارات"
        subtitle="استقبال طلبات الاستشارة من الموقع أو الهاتف أو المكتب، وتوثيق الرأي القانوني والتوصية وربطها بالعميل أو القضية."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الاستشارات" value={consultations.length} icon={<IconMessage />} />
        <StatCard label="جديدة" value={waiting} icon={<IconPlus />} />
        <StatCard label="قيد الدراسة" value={inReview} icon={<IconUser />} />
        <StatCard label="الرأي جاهز" value={ready} icon={<IconCheck />} />
      </div>

      {canManage && (
        <section className="form-panel">
          <div className="form-heading">
            <div>
              <h2 className="form-title">إضافة استشارة</h2>
              <p className="form-subtitle">سجل الاستشارة واربطها بالموكل أو القضية عند توفر البيانات.</p>
            </div>
          </div>
          <ConsultationForm clients={clients} cases={cases} users={users} />
        </section>
      )}

      {consultations.length === 0 ? (
        <EmptyState icon={<IconMessage />} title="لا توجد استشارات بعد" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {consultations.map((item) => (
            <article key={item.id} className="form-panel">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">{item.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {CONSULTATION_SOURCE_LABELS[item.source]} - {formatDateTime(item.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.client ? displayClient(item.client) : item.requesterName ?? "بدون موكل"}
                    {item.case ? ` - ${item.case.caseNumber}` : ""}
                    {item.assignedTo ? ` - المسؤول: ${item.assignedTo.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={CONSULTATION_STATUS_COLORS[item.status]}>
                    {CONSULTATION_STATUS_LABELS[item.status]}
                  </Badge>
                  <Badge className={CONSULTATION_PRIORITY_COLORS[item.priority]}>
                    {CONSULTATION_PRIORITY_LABELS[item.priority]}
                  </Badge>
                </div>
              </div>

              {canManage ? (
                <ConsultationForm
                  consultation={{
                    id: item.id,
                    title: item.title,
                    question: item.question,
                    legalOpinion: item.legalOpinion,
                    recommendation: item.recommendation,
                    status: item.status,
                    priority: item.priority,
                    source: item.source,
                    requesterName: item.requesterName,
                    requesterPhone: item.requesterPhone,
                    requesterEmail: item.requesterEmail,
                    clientId: item.clientId,
                    caseId: item.caseId,
                    assignedToId: item.assignedToId,
                  }}
                  clients={clients}
                  cases={cases}
                  users={users}
                  compact
                />
              ) : (
                <div className="space-y-3 text-sm leading-7 text-gray-700">
                  <p className="whitespace-pre-wrap">{item.question}</p>
                  {item.legalOpinion && <p className="whitespace-pre-wrap">{item.legalOpinion}</p>}
                  {item.recommendation && <p className="whitespace-pre-wrap">التوصية: {item.recommendation}</p>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsultationForm({
  consultation,
  clients,
  cases,
  users,
  compact = false,
}: {
  consultation?: {
    id: string;
    title: string;
    question: string;
    legalOpinion: string | null;
    recommendation: string | null;
    status: string;
    priority: string;
    source: string;
    requesterName: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    clientId: string | null;
    caseId: string | null;
    assignedToId: string | null;
  };
  clients: Array<{ id: string; name: string; companyName: string | null; type: string }>;
  cases: Array<{ id: string; title: string; caseNumber: string; clientId: string }>;
  users: Array<{ id: string; name: string }>;
  compact?: boolean;
}) {
  return (
    <form action={saveConsultationFormAction} className="form-grid">
      {consultation && <input type="hidden" name="id" value={consultation.id} />}
      <div className={compact ? "sm:col-span-2" : ""}>
        <label className="label">العنوان</label>
        <input name="title" required className="field" defaultValue={consultation?.title ?? ""} />
      </div>
      <div>
        <label className="label">الحالة</label>
        <select name="status" className="field" defaultValue={consultation?.status ?? "NEW"}>
          {statuses.map((status) => (
            <option key={status} value={status}>{CONSULTATION_STATUS_LABELS[status]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">الأولوية</label>
        <select name="priority" className="field" defaultValue={consultation?.priority ?? "MEDIUM"}>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>{CONSULTATION_PRIORITY_LABELS[priority]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">المصدر</label>
        <select name="source" className="field" defaultValue={consultation?.source ?? "OFFICE"}>
          {sources.map((source) => (
            <option key={source} value={source}>{CONSULTATION_SOURCE_LABELS[source]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">المسؤول</label>
        <select name="assignedToId" className="field" defaultValue={consultation?.assignedToId ?? ""}>
          <option value="">غير مسند</option>
          {users.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">الموكل</label>
        <select name="clientId" className="field" defaultValue={consultation?.clientId ?? ""}>
          <option value="">بدون ربط</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{displayClient(client)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">القضية</label>
        <select name="caseId" className="field" defaultValue={consultation?.caseId ?? ""}>
          <option value="">بدون ربط</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.caseNumber} - {item.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">اسم طالب الاستشارة</label>
        <input name="requesterName" className="field" defaultValue={consultation?.requesterName ?? ""} />
      </div>
      <div>
        <label className="label">رقم التواصل</label>
        <input name="requesterPhone" dir="ltr" className="field" defaultValue={consultation?.requesterPhone ?? ""} />
      </div>
      <div>
        <label className="label">البريد</label>
        <input name="requesterEmail" type="email" dir="ltr" className="field" defaultValue={consultation?.requesterEmail ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">تفاصيل الاستشارة</label>
        <textarea name="question" required rows={compact ? 3 : 4} className="field" defaultValue={consultation?.question ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">الرأي القانوني</label>
        <textarea name="legalOpinion" rows={compact ? 4 : 5} className="field" defaultValue={consultation?.legalOpinion ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">التوصية / الخطوة التالية</label>
        <textarea name="recommendation" rows={2} className="field" defaultValue={consultation?.recommendation ?? ""} />
      </div>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className="btn-primary">
          {consultation ? "حفظ التعديل" : "إضافة الاستشارة"}
        </button>
        {consultation && (
          <button type="submit" formAction={deleteConsultationFormAction} className="btn-danger">
            حذف
          </button>
        )}
      </div>
    </form>
  );
}
