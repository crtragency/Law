import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { Badge } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  EVENT_TYPE_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import {
  CaseEditSection,
  NotesSection,
  DocumentsSection,
} from "./case-detail";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("cases.view");
  const canManage = hasPermission(user.role, "cases.manage");
  const canManageDocs = hasPermission(user.role, "documents.manage");
  const { id } = await params;

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      client: true,
      assignedLawyer: { select: { id: true, name: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { name: true } } },
      },
      events: { orderBy: { startAt: "asc" } },
    },
  });

  if (!c) notFound();

  const [clients, lawyers] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "LAWYER", "PARALEGAL"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cases" className="text-sm text-brand-600 hover:underline">
          ← رجوع للقضايا
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{c.title}</h1>
            <p className="mt-1 text-sm text-gray-500" dir="ltr">
              {c.caseNumber}
            </p>
          </div>
          <Badge className={CASE_STATUS_COLORS[c.status]}>
            {CASE_STATUS_LABELS[c.status]}
          </Badge>
        </div>
      </div>

      {/* بيانات القضية */}
      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="الموكّل" value={c.client.name} />
        <Info label="نوع القضية" value={CASE_TYPE_LABELS[c.caseType]} />
        <Info label="المحكمة" value={c.court ?? "—"} />
        <Info label="المحامي المسؤول" value={c.assignedLawyer?.name ?? "—"} />
        <Info label="تاريخ الفتح" value={formatDate(c.openedAt)} />
        <Info
          label="هاتف الموكّل"
          value={c.client.phone ?? "—"}
        />
        {c.description && (
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="label">التفاصيل</div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {c.description}
            </p>
          </div>
        )}
      </div>

      <CaseEditSection
        canManage={canManage}
        clients={clients}
        lawyers={lawyers}
        values={{
          id: c.id,
          caseNumber: c.caseNumber,
          title: c.title,
          clientId: c.clientId,
          court: c.court,
          caseType: c.caseType,
          status: c.status,
          assignedLawyerId: c.assignedLawyerId,
          description: c.description,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DocumentsSection
          caseId={c.id}
          canManage={canManageDocs}
          documents={c.documents.map((d) => ({
            id: d.id,
            title: d.title,
            storageKey: d.storageKey,
            fileName: d.fileName,
            uploaderName: d.uploadedBy?.name ?? null,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
        <NotesSection
          caseId={c.id}
          notes={c.notes.map((n) => ({
            id: n.id,
            body: n.body,
            authorName: n.author?.name ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </div>

      {/* المهام المرتبطة */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">✅ مهام القضية</h3>
          <Link href="/tasks" className="text-sm text-brand-600 hover:underline">
            كل المهام
          </Link>
        </div>
        {c.tasks.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مهام مرتبطة بهذه القضية</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {c.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{t.title}</span>
                  <span className="mr-2 text-xs text-gray-400">
                    {t.assignedTo?.name ?? "غير مُسندة"}
                  </span>
                </div>
                <Badge className={TASK_STATUS_COLORS[t.status]}>
                  {TASK_STATUS_LABELS[t.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المواعيد المرتبطة */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">📅 مواعيد وجلسات القضية</h3>
          <Link href="/calendar" className="text-sm text-brand-600 hover:underline">
            التقويم
          </Link>
        </div>
        {c.events.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مواعيد مرتبطة</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {c.events.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{ev.title}</span>
                  <span className="mr-2 text-xs text-gray-400">
                    {EVENT_TYPE_LABELS[ev.type]}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(ev.startAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}
