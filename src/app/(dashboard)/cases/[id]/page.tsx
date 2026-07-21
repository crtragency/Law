import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { Badge, StatCard } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_TYPE_LABELS,
  CONTRACT_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  DOCUMENT_REQUEST_STATUS_COLORS,
  DOCUMENT_REQUEST_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LITIGATION_STAGE_LABELS,
  LITIGATION_STEP_STATUS_COLORS,
  LITIGATION_STEP_STATUS_LABELS,
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { buildCaseChecklist } from "@/lib/case-checklists";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import {
  CaseEditSection,
  CaseConversationSection,
  NotesSection,
  DocumentsSection,
} from "./case-detail";
import { DeleteCaseButton } from "../delete-case-button";
import {
  IconBell,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFileText,
  IconInbox,
} from "@/components/icons";

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
      documentRequests: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: { createdBy: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      caseMessages: {
        orderBy: { createdAt: "asc" },
        include: {
          staffAuthor: { select: { name: true } },
          clientAuthor: { select: { name: true } },
        },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { name: true } } },
      },
      events: { orderBy: { startAt: "asc" } },
      litigationSteps: {
        orderBy: [{ sessionDate: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: { assignedTo: { select: { name: true } } },
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { name: true } } },
      },
      contracts: { orderBy: { createdAt: "desc" } },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { payments: true },
      },
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

  const now = new Date();
  const nextEvent = c.events.find((event) => event.startAt >= now);
  const openTasks = c.tasks.filter((task) => !["DONE", "CANCELLED"].includes(task.status));
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < now);
  const pendingDocumentRequests = c.documentRequests.filter((request) => request.status === "REQUESTED");
  const openServiceRequests = c.serviceRequests.filter(
    (request) => !["COMPLETED", "CANCELLED"].includes(request.status)
  );
  const invoiceOutstanding = c.invoices.reduce((sum, invoice) => {
    const total = computeTax(invoice.amountBeforeTax, invoice.taxRate).total;
    const paid = invoice.payments.reduce((inner, payment) => inner + payment.amount, 0);
    return sum + Math.max(total - paid, 0);
  }, 0);
  const checklist = buildCaseChecklist({
    caseType: c.caseType,
    court: c.court,
    description: c.description,
    documents: c.documents.map((doc) => ({ title: doc.title, category: doc.category })),
    tasks: c.tasks.map((task) => ({ title: task.title, status: task.status })),
    eventsCount: c.events.length,
    litigationStepsCount: c.litigationSteps.length,
    contractsCount: c.contracts.length,
  });
  const checklistDone = checklist.filter((item) => item.done).length;
  const completion = checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0;
  const timeline = [
    {
      id: `case-${c.id}`,
      date: c.createdAt,
      title: "فتح القضية",
      meta: `${c.caseNumber} - ${c.client.name}`,
      badge: CASE_STATUS_LABELS[c.status],
      badgeClass: CASE_STATUS_COLORS[c.status],
      body: c.description,
    },
    ...c.documents.map((doc) => ({
      id: `doc-${doc.id}`,
      date: doc.createdAt,
      title: `مستند: ${doc.title}`,
      meta: doc.category ?? doc.fileName,
      badge: doc.visibility === "PORTAL" ? "ظاهر للعميل" : "داخلي",
      badgeClass: doc.visibility === "PORTAL" ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-600",
      body: doc.notes,
    })),
    ...c.documentRequests.map((request) => ({
      id: `doc-request-${request.id}`,
      date: request.dueDate ?? request.createdAt,
      title: `طلب مستند: ${request.title}`,
      meta: request.category ?? "مستند مطلوب",
      badge: DOCUMENT_REQUEST_STATUS_LABELS[request.status],
      badgeClass: DOCUMENT_REQUEST_STATUS_COLORS[request.status],
      body: request.description,
    })),
    ...c.notes.map((note) => ({
      id: `note-${note.id}`,
      date: note.createdAt,
      title: "ملاحظة فريق",
      meta: note.author?.name ?? "مستخدم محذوف",
      badge: "ملاحظة",
      badgeClass: "bg-gray-100 text-gray-600",
      body: note.body,
    })),
    ...c.tasks.map((task) => ({
      id: `task-${task.id}`,
      date: task.dueDate ?? task.createdAt,
      title: `مهمة: ${task.title}`,
      meta: task.assignedTo?.name ?? "غير مسندة",
      badge: TASK_STATUS_LABELS[task.status],
      badgeClass: TASK_STATUS_COLORS[task.status],
      body: task.description,
    })),
    ...c.events.map((event) => ({
      id: `event-${event.id}`,
      date: event.startAt,
      title: `موعد: ${event.title}`,
      meta: event.location ?? EVENT_TYPE_LABELS[event.type],
      badge: EVENT_TYPE_LABELS[event.type],
      badgeClass: EVENT_TYPE_COLORS[event.type] ?? "bg-gray-100 text-gray-600",
      body: event.notes,
    })),
    ...c.litigationSteps.map((step) => ({
      id: `litigation-${step.id}`,
      date: step.sessionDate ?? step.dueDate ?? step.createdAt,
      title: `إجراء تقاضي: ${step.title}`,
      meta: LITIGATION_STAGE_LABELS[step.stage],
      badge: LITIGATION_STEP_STATUS_LABELS[step.status],
      badgeClass: LITIGATION_STEP_STATUS_COLORS[step.status],
      body: step.outcome ?? step.nextAction ?? step.notes,
    })),
    ...c.serviceRequests.map((request) => ({
      id: `service-${request.id}`,
      date: request.dueDate ?? request.createdAt,
      title: `طلب خدمة: ${request.title}`,
      meta: SERVICE_AREA_LABELS[request.serviceArea],
      badge: SERVICE_STATUS_LABELS[request.status],
      badgeClass: SERVICE_STATUS_COLORS[request.status],
      body: request.description,
    })),
    ...c.contracts.map((contract) => ({
      id: `contract-${contract.id}`,
      date: contract.dateGregorian ?? contract.createdAt,
      title: `اتفاقية أتعاب: ${contract.number}`,
      meta: formatMoneyLabel(computeTax(contract.amountBeforeTax, contract.taxRate).total),
      badge: CONTRACT_STATUS_LABELS[contract.status],
      badgeClass: CONTRACT_STATUS_COLORS[contract.status],
      body: contract.scope,
    })),
    ...c.invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      date: invoice.dueDate ?? invoice.issueDate,
      title: `فاتورة: ${invoice.number}`,
      meta: formatMoneyLabel(computeTax(invoice.amountBeforeTax, invoice.taxRate).total),
      badge: INVOICE_STATUS_LABELS[invoice.status],
      badgeClass: INVOICE_STATUS_COLORS[invoice.status],
      body: invoice.notes,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cases"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          رجوع إلى القضايا
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{c.title}</h1>
            <p className="mt-1 text-sm text-gray-500" dir="ltr">
              {c.caseNumber}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={CASE_STATUS_COLORS[c.status]}>
              {CASE_STATUS_LABELS[c.status]}
            </Badge>
            {canManage && (
              <DeleteCaseButton
                id={c.id}
                caseLabel={`${c.caseNumber} - ${c.title}`}
                redirectTo="/cases"
                variant="button"
              />
            )}
          </div>
        </div>
        <div className="rule-double mt-4" aria-hidden />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="اكتمال الملف" value={`${completion}%`} icon={<IconCheck />} />
        <StatCard
          label="الموعد القادم"
          value={nextEvent ? formatDate(nextEvent.startAt) : "لا يوجد"}
          icon={<IconCalendar />}
        />
        <StatCard label="مهام مفتوحة" value={openTasks.length} icon={<IconClock />} />
        <StatCard label="مستندات مطلوبة" value={pendingDocumentRequests.length} icon={<IconFileText />} />
        <StatCard label="طلبات العميل" value={openServiceRequests.length} icon={<IconInbox />} />
        <StatCard label="مستحقات" value={formatMoneyLabel(invoiceOutstanding)} icon={<IconBell />} />
      </div>

      {overdueTasks.length > 0 && (
        <div className="rounded-2xl border border-seal-100 bg-seal-50 p-4 text-sm font-semibold text-seal-700">
          يوجد {overdueTasks.length} مهمة متأخرة تحتاج متابعة.
        </div>
      )}

      {/* بيانات القضية */}
      <div className="form-panel form-grid lg:grid-cols-3">
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

      <div className="data-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">قائمة جاهزية القضية</h2>
            <p className="mt-1 text-sm text-gray-500">
              {checklistDone} من {checklist.length} بند مكتمل حسب نوع القضية.
            </p>
          </div>
          <Badge className={completion >= 80 ? "bg-brand-50 text-brand-800" : "bg-brass-50 text-brass-800"}>
            {completion}% مكتمل
          </Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-3 ${
                item.done ? "border-brand-100 bg-brand-50/60" : "border-line bg-paper/70"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${
                    item.done ? "bg-brand-700 text-white" : "bg-white text-gray-400"
                  }`}
                >
                  {item.done ? "تم" : "!"}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{item.label}</p>
                  {!item.done && <p className="mt-1 text-xs leading-6 text-gray-500">{item.hint}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <CaseConversationSection
          caseId={c.id}
          messages={c.caseMessages.map((message) => ({
            id: message.id,
            body: message.body,
            authorType: message.authorType,
            authorName:
              message.authorType === "STAFF"
                ? message.staffAuthor?.name ?? "المكتب"
                : message.clientAuthor?.name ?? c.client.name,
            createdAt: message.createdAt.toISOString(),
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

      <DocumentsSection
        caseId={c.id}
        canManage={canManageDocs}
        documents={c.documents.map((d) => ({
          id: d.id,
          title: d.title,
          storageKey: d.storageKey,
          fileName: d.fileName,
          category: d.category,
          visibility: d.visibility,
          expiresAt: d.expiresAt?.toISOString() ?? null,
          notes: d.notes,
          extractedText: d.extractedText,
          ocrStatus: d.ocrStatus,
          uploaderName: d.uploadedBy?.name ?? null,
          createdAt: d.createdAt.toISOString(),
        }))}
        documentRequests={c.documentRequests.map((request) => ({
          id: request.id,
          title: request.title,
          category: request.category,
          description: request.description,
          dueDate: request.dueDate?.toISOString() ?? null,
          status: request.status,
          createdByName: request.createdBy?.name ?? null,
          createdAt: request.createdAt.toISOString(),
        }))}
      />

      <div className="data-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">الخط الزمني الذكي</h2>
            <p className="mt-1 text-sm text-gray-500">
              كل ما يخص القضية في مسار واحد: مستندات، ملاحظات، مهام، جلسات، عقود، فواتير وطلبات.
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-600">{timeline.length} حدث</Badge>
        </div>
        <div className="space-y-3">
          {timeline.slice(0, 18).map((item) => (
            <div key={item.id} className="grid gap-3 rounded-2xl border border-line bg-paper/60 p-4 lg:grid-cols-[150px_1fr_auto]">
              <div className="text-xs font-semibold text-gray-500">{formatDateTime(item.date)}</div>
              <div>
                <p className="font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
                {item.body && (
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                    {item.body}
                  </p>
                )}
              </div>
              <Badge className={item.badgeClass}>{item.badge}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <IconInbox className="h-5 w-5 text-brand-600" /> Inbox طلبات العميل
          </h3>
          <Link href="/services" className="text-sm text-brand-700 hover:underline">
            كل الطلبات
          </Link>
        </div>
        {c.serviceRequests.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد طلبات مرتبطة بهذه القضية</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {c.serviceRequests.slice(0, 8).map((request) => (
              <div key={request.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{request.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {SERVICE_AREA_LABELS[request.serviceArea]}
                    {request.assignedTo ? ` - ${request.assignedTo.name}` : ""}
                    {request.dueDate ? ` - استحقاق ${formatDate(request.dueDate)}` : ""}
                  </p>
                  {request.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-gray-600">
                      {request.description}
                    </p>
                  )}
                </div>
                <Badge className={SERVICE_STATUS_COLORS[request.status]}>
                  {SERVICE_STATUS_LABELS[request.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المهام المرتبطة */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <IconCheck className="h-5 w-5 text-brand-600" /> مهام القضية
          </h3>
          <Link href="/tasks" className="text-sm text-brand-700 hover:underline">
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
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <IconCalendar className="h-5 w-5 text-brand-600" /> مواعيد وجلسات
            القضية
          </h3>
          <Link href="/calendar" className="text-sm text-brand-700 hover:underline">
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
