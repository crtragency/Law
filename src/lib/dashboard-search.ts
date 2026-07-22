import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPE_LABELS,
  CASE_STATUS_LABELS,
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_OUTCOME_COLORS,
  COMMUNICATION_OUTCOME_LABELS,
  CONSULTATION_PRIORITY_LABELS,
  CONSULTATION_STATUS_COLORS,
  CONSULTATION_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  CORRESPONDENCE_STATUS_COLORS,
  CORRESPONDENCE_STATUS_LABELS,
  DOCUMENT_REQUEST_STATUS_COLORS,
  DOCUMENT_REQUEST_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  EXPENSE_STATUS_COLORS,
  EXPENSE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LEGAL_TEMPLATE_CATEGORY_LABELS,
  LIBRARY_ENTRY_TYPE_LABELS,
  LITIGATION_STAGE_LABELS,
  LITIGATION_STEP_STATUS_LABELS,
  MESSAGE_TEMPLATE_CHANNEL_LABELS,
  MEETING_MINUTE_STATUS_COLORS,
  MEETING_MINUTE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  POWER_STATUS_COLORS,
  POWER_STATUS_LABELS,
  REMINDER_STATUS_LABELS,
  SERVICE_AREA_LABELS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { computeTax, formatMoneyLabel } from "@/lib/money";
import type {
  DashboardSearchGroup,
  DashboardSearchResponse,
} from "@/lib/search-types";

interface SearchUser {
  id: string;
  role: Role;
}

function displayClient(client: { name: string; companyName?: string | null; type?: string }) {
  return client.type === "COMPANY" && client.companyName ? client.companyName : client.name;
}

function cleanQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, 120);
}

function compactGroups(groups: DashboardSearchGroup[]): DashboardSearchResponse {
  const visibleGroups = groups.filter((group) => group.results.length > 0);
  return {
    query: "",
    total: visibleGroups.reduce((sum, group) => sum + group.results.length, 0),
    groups: visibleGroups,
  };
}

export async function runDashboardSearch(
  rawQuery: string,
  user: SearchUser
): Promise<DashboardSearchResponse> {
  const query = cleanQuery(rawQuery);
  if (!query) return { query, total: 0, groups: [] };

  const textFilter = { contains: query, mode: "insensitive" as const };
  const jobs: Promise<DashboardSearchGroup>[] = [];

  if (hasPermission(user.role, "clients.view")) {
    jobs.push(
      prisma.client
        .findMany({
          where: {
            OR: [
              { name: textFilter },
              { companyName: textFilter },
              { phone: textFilter },
              { email: textFilter },
              { nationalId: textFilter },
              { unifiedNumber: textFilter },
              { taxNumber: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((clients) => ({
          title: "الموكلون",
          results: clients.map((client) => ({
            id: `client-${client.id}`,
            title: displayClient(client),
            href: "/clients",
            subtitle: client.email ?? client.phone ?? client.address ?? undefined,
            badge: client.type === "COMPANY" ? "منشأة" : "فرد",
          })),
        }))
    );
    jobs.push(
      prisma.messageTemplate
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { trigger: textFilter },
              { subject: textFilter },
              { body: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((templates) => ({
          title: "قوالب الرسائل",
          results: templates.map((item) => ({
            id: `message-template-${item.id}`,
            title: item.title,
            href: "/templates",
            subtitle: item.subject ?? item.trigger ?? undefined,
            badge: MESSAGE_TEMPLATE_CHANNEL_LABELS[item.channel],
          })),
        }))
    );
  }

  if (hasPermission(user.role, "cases.view")) {
    jobs.push(
      prisma.case
        .findMany({
          where: {
            OR: [
              { caseNumber: textFilter },
              { title: textFilter },
              { court: textFilter },
              { description: textFilter },
            ],
          },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((cases) => ({
          title: "القضايا",
          results: cases.map((item) => ({
            id: `case-${item.id}`,
            title: item.title,
            href: `/cases/${item.id}`,
            subtitle: `${item.caseNumber} - ${displayClient(item.client)}`,
            badge: CASE_STATUS_LABELS[item.status],
            meta: item.court ?? undefined,
          })),
        }))
    );
    jobs.push(
      prisma.communicationLog
        .findMany({
          where: {
            OR: [
              { subject: textFilter },
              { summary: textFilter },
              { contactName: textFilter },
              { contactInfo: textFilter },
              { notes: textFilter },
              { case: { is: { title: textFilter } } },
              { case: { is: { caseNumber: textFilter } } },
            ],
          },
          include: { case: { select: { id: true, title: true, caseNumber: true } }, assignedTo: { select: { name: true } } },
          orderBy: { occurredAt: "desc" },
          take: 6,
        })
        .then((logs) => ({
          title: "سجل الاتصالات",
          results: logs.map((item) => ({
            id: `communication-${item.id}`,
            title: item.subject,
            href: "/communications",
            subtitle: item.case ? `${item.case.caseNumber} - ${item.case.title}` : item.contactName ?? undefined,
            badge: COMMUNICATION_OUTCOME_LABELS[item.outcome],
            badgeClass: COMMUNICATION_OUTCOME_COLORS[item.outcome],
            meta: `${COMMUNICATION_CHANNEL_LABELS[item.channel]} - ${formatDateTime(item.occurredAt)}${item.assignedTo ? ` - ${item.assignedTo.name}` : ""}`,
          })),
        }))
    );

    jobs.push(
      prisma.correspondenceRegister
        .findMany({
          where: {
            OR: [
              { number: textFilter },
              { title: textFilter },
              { sender: textFilter },
              { recipient: textFilter },
              { referenceNumber: textFilter },
              { summary: textFilter },
              { notes: textFilter },
            ],
          },
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((items) => ({
          title: "الوارد والصادر",
          results: items.map((item) => ({
            id: `correspondence-${item.id}`,
            title: `${item.number} - ${item.title}`,
            href: "/correspondence",
            subtitle: item.case ? `${item.case.caseNumber} - ${item.case.title}` : item.sender ?? item.recipient ?? undefined,
            badge: CORRESPONDENCE_STATUS_LABELS[item.status],
            badgeClass: CORRESPONDENCE_STATUS_COLORS[item.status],
            meta: item.dueAt ? `موعد رد ${formatDateTime(item.dueAt)}` : item.referenceNumber ?? undefined,
          })),
        }))
    );

    jobs.push(
      prisma.meetingMinute
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { location: textFilter },
              { attendees: textFilter },
              { agenda: textFilter },
              { decisions: textFilter },
              { actionItems: textFilter },
              { notes: textFilter },
            ],
          },
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
          orderBy: { meetingAt: "desc" },
          take: 6,
        })
        .then((items) => ({
          title: "محاضر الاجتماعات",
          results: items.map((item) => ({
            id: `meeting-${item.id}`,
            title: item.title,
            href: "/meetings",
            subtitle: item.case ? `${item.case.caseNumber} - ${item.case.title}` : item.location ?? undefined,
            badge: MEETING_MINUTE_STATUS_LABELS[item.status],
            badgeClass: MEETING_MINUTE_STATUS_COLORS[item.status],
            meta: formatDateTime(item.meetingAt),
          })),
        }))
    );

    jobs.push(
      prisma.settlementOffer
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { offeredBy: textFilter },
              { terms: textFilter },
              { notes: textFilter },
              { case: { is: { title: textFilter } } },
              { case: { is: { caseNumber: textFilter } } },
            ],
          },
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((items) => ({
          title: "التسويات والعروض",
          results: items.map((item) => ({
            id: `settlement-${item.id}`,
            title: item.title,
            href: "/settlements",
            subtitle: `${item.case.caseNumber} - ${item.case.title}`,
            badge: SETTLEMENT_STATUS_LABELS[item.status],
            badgeClass: SETTLEMENT_STATUS_COLORS[item.status],
            meta: item.amountBeforeTax === null ? item.offeredBy ?? undefined : formatMoneyLabel(computeTax(item.amountBeforeTax, item.taxRate).total),
          })),
        }))
    );
  }

  if (hasPermission(user.role, "documents.view")) {
    jobs.push(
      prisma.document
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { fileName: textFilter },
              { category: textFilter },
              { tags: textFilter },
              { notes: textFilter },
              { extractedText: textFilter },
            ],
          },
          include: { case: { select: { id: true, title: true, caseNumber: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
        .then((documents) => ({
          title: "المستندات",
          results: documents.map((item) => ({
            id: `document-${item.id}`,
            title: item.title,
            href: `/cases/${item.caseId}`,
            subtitle: `${item.case.caseNumber} - ${item.case.title}`,
            badge: item.visibility === "PORTAL" ? "ظاهر للعميل" : "داخلي",
            meta: item.category ?? item.fileName,
          })),
        }))
    );
    jobs.push(
      prisma.documentRequest
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { category: textFilter },
              { description: textFilter },
              { case: { is: { title: textFilter } } },
              { case: { is: { caseNumber: textFilter } } },
            ],
          },
          include: { case: { select: { id: true, title: true, caseNumber: true, client: { select: { name: true, companyName: true, type: true } } } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((requests) => ({
          title: "طلبات المستندات",
          results: requests.map((item) => ({
            id: `document-request-${item.id}`,
            title: item.title,
            href: "/document-requests",
            subtitle: `${item.case.caseNumber} - ${item.case.title} - ${displayClient(item.case.client)}`,
            badge: DOCUMENT_REQUEST_STATUS_LABELS[item.status],
            badgeClass: DOCUMENT_REQUEST_STATUS_COLORS[item.status],
            meta: item.dueDate ? `استحقاق ${formatDate(item.dueDate)}` : item.category ?? undefined,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "tasks.view")) {
    jobs.push(
      prisma.task
        .findMany({
          where: { OR: [{ title: textFilter }, { description: textFilter }] },
          include: {
            assignedTo: { select: { name: true } },
            case: { select: { title: true, caseNumber: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((tasks) => ({
          title: "المهام",
          results: tasks.map((item) => ({
            id: `task-${item.id}`,
            title: item.title,
            href: "/tasks",
            subtitle: item.case
              ? `${item.case.caseNumber} - ${item.case.title}`
              : item.assignedTo?.name ?? undefined,
            badge: TASK_STATUS_LABELS[item.status],
            badgeClass: TASK_STATUS_COLORS[item.status],
            meta: `${TASK_PRIORITY_LABELS[item.priority] ?? item.priority}${
              item.dueDate ? ` - ${formatDate(item.dueDate)}` : ""
            }`,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "events.view")) {
    jobs.push(
      prisma.event
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { location: textFilter },
              { notes: textFilter },
            ],
          },
          include: { case: { select: { title: true, caseNumber: true } } },
          orderBy: { startAt: "desc" },
          take: 6,
        })
        .then((events) => ({
          title: "المواعيد والجلسات",
          results: events.map((item) => ({
            id: `event-${item.id}`,
            title: item.title,
            href: "/calendar",
            subtitle: item.case
              ? `${item.case.caseNumber} - ${item.case.title}`
              : item.location ?? undefined,
            badge: EVENT_TYPE_LABELS[item.type],
            meta: formatDateTime(item.startAt),
          })),
        }))
    );
  }

  if (hasPermission(user.role, "contacts.view")) {
    jobs.push(
      prisma.legalContact
        .findMany({
          where: {
            OR: [
              { name: textFilter },
              { organization: textFilter },
              { roleTitle: textFilter },
              { phone: textFilter },
              { email: textFilter },
              { notes: textFilter },
            ],
          },
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            case: { select: { title: true, caseNumber: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((contacts) => ({
          title: "جهات الاتصال",
          results: contacts.map((item) => ({
            id: `contact-${item.id}`,
            title: item.name,
            href: "/contacts",
            subtitle: item.organization ?? item.roleTitle ?? item.phone ?? undefined,
            badge: CONTACT_TYPE_LABELS[item.type],
            meta: item.case
              ? `${item.case.caseNumber} - ${item.case.title}`
              : item.client
                ? displayClient(item.client)
                : undefined,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "powers.view")) {
    jobs.push(
      prisma.powerOfAttorney
        .findMany({
          where: {
            OR: [
              { number: textFilter },
              { title: textFilter },
              { issuer: textFilter },
              { representative: textFilter },
              { scope: textFilter },
              { notes: textFilter },
            ],
          },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((powers) => ({
          title: "التوكيلات",
          results: powers.map((item) => ({
            id: `power-${item.id}`,
            title: item.title,
            href: "/powers",
            subtitle: `${item.number} - ${displayClient(item.client)}`,
            badge: POWER_STATUS_LABELS[item.status],
            badgeClass: POWER_STATUS_COLORS[item.status],
            meta: item.expiresAt ? `تنتهي في ${formatDate(item.expiresAt)}` : undefined,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "litigation.view")) {
    jobs.push(
      prisma.litigationStep
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { court: textFilter },
              { circuit: textFilter },
              { outcome: textFilter },
              { nextAction: textFilter },
              { notes: textFilter },
            ],
          },
          include: {
            case: { select: { title: true, caseNumber: true } },
            assignedTo: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((steps) => ({
          title: "إجراءات التقاضي",
          results: steps.map((item) => ({
            id: `litigation-${item.id}`,
            title: item.title,
            href: "/litigation",
            subtitle: `${item.case.caseNumber} - ${item.case.title}`,
            badge: LITIGATION_STEP_STATUS_LABELS[item.status],
            meta: `${LITIGATION_STAGE_LABELS[item.stage] ?? item.stage}${
              item.assignedTo ? ` - ${item.assignedTo.name}` : ""
            }`,
          })),
        }))
    );

    jobs.push(
      prisma.hearingMinute
        .findMany({
          where: {
            OR: [
              { decision: textFilter },
              { requirements: textFilter },
              { notes: textFilter },
              { court: textFilter },
              { circuit: textFilter },
              { case: { is: { title: textFilter } } },
              { case: { is: { caseNumber: textFilter } } },
            ],
          },
          include: {
            case: { select: { id: true, title: true, caseNumber: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: { sessionDate: "desc" },
          take: 6,
        })
        .then((minutes) => ({
          title: "محاضر الجلسات",
          results: minutes.map((item) => ({
            id: `hearing-minute-${item.id}`,
            title: item.case.title,
            href: `/cases/${item.caseId}`,
            subtitle: `${item.case.caseNumber} - ${formatDateTime(item.sessionDate)}`,
            badge: item.nextSessionAt ? "جلسة قادمة" : "محضر",
            meta: item.createdBy?.name ?? item.court ?? undefined,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "services.view")) {
    jobs.push(
      prisma.serviceRequest
        .findMany({
          where: { OR: [{ title: textFilter }, { description: textFilter }] },
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            case: { select: { title: true, caseNumber: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((requests) => ({
          title: "طلبات الخدمات",
          results: requests.map((item) => ({
            id: `service-${item.id}`,
            title: item.title,
            href: "/services",
            subtitle: SERVICE_AREA_LABELS[item.serviceArea],
            badge: SERVICE_STATUS_LABELS[item.status],
            badgeClass: SERVICE_STATUS_COLORS[item.status],
            meta: item.case
              ? `${item.case.caseNumber} - ${item.case.title}`
              : item.client
                ? displayClient(item.client)
                : undefined,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "consultations.view")) {
    jobs.push(
      prisma.legalConsultation
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { question: textFilter },
              { legalOpinion: textFilter },
              { recommendation: textFilter },
              { requesterName: textFilter },
              { requesterPhone: textFilter },
              { requesterEmail: textFilter },
            ],
          },
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            case: { select: { title: true, caseNumber: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((consultations) => ({
          title: "الاستشارات",
          results: consultations.map((item) => ({
            id: `consultation-${item.id}`,
            title: item.title,
            href: "/consultations",
            subtitle: item.case
              ? `${item.case.caseNumber} - ${item.case.title}`
              : item.client
                ? displayClient(item.client)
                : item.requesterName ?? undefined,
            badge: CONSULTATION_STATUS_LABELS[item.status],
            badgeClass: CONSULTATION_STATUS_COLORS[item.status],
            meta: CONSULTATION_PRIORITY_LABELS[item.priority],
          })),
        }))
    );
  }

  if (hasPermission(user.role, "library.view")) {
    jobs.push(
      prisma.legalLibraryEntry
        .findMany({
          where: {
            AND: [
              hasPermission(user.role, "library.manage") ? {} : { isPublished: true },
              {
                OR: [
                  { title: textFilter },
                  { summary: textFilter },
                  { content: textFilter },
                  { tags: textFilter },
                  { jurisdiction: textFilter },
                  { court: textFilter },
                ],
              },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((entries) => ({
          title: "المكتبة القانونية",
          results: entries.map((item) => ({
            id: `library-${item.id}`,
            title: item.title,
            href: "/library",
            subtitle: item.summary ?? item.tags ?? undefined,
            badge: LIBRARY_ENTRY_TYPE_LABELS[item.type],
            meta: item.court ?? item.jurisdiction ?? undefined,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "contracts.view")) {
    jobs.push(
      prisma.contract
        .findMany({
          where: { OR: [{ number: textFilter }, { scope: textFilter }, { notes: textFilter }] },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((contracts) => ({
          title: "اتفاقيات الأتعاب",
          results: contracts.map((item) => ({
            id: `contract-${item.id}`,
            title: item.number,
            href: `/contracts/${item.id}`,
            subtitle: displayClient(item.client),
            badge: CONTRACT_STATUS_LABELS[item.status],
            meta: item.scope,
          })),
        }))
    );
  }

  if (hasPermission(user.role, "finance.view")) {
    jobs.push(
      prisma.invoice
        .findMany({
          where: { OR: [{ number: textFilter }, { notes: textFilter }] },
          include: { client: { select: { name: true, companyName: true, type: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((invoices) => ({
          title: "الفواتير",
          results: invoices.map((item) => ({
            id: `invoice-${item.id}`,
            title: item.number,
            href: "/finance",
            subtitle: displayClient(item.client),
            badge: INVOICE_STATUS_LABELS[item.status],
            badgeClass: INVOICE_STATUS_COLORS[item.status],
            meta: formatMoneyLabel(computeTax(item.amountBeforeTax, item.taxRate).total),
          })),
        }))
    );

    jobs.push(
      prisma.payment
        .findMany({
          where: { OR: [{ reference: textFilter }, { notes: textFilter }] },
          include: {
            client: { select: { name: true, companyName: true, type: true } },
            invoice: { select: { number: true } },
          },
          orderBy: { paidAt: "desc" },
          take: 6,
        })
        .then((payments) => ({
          title: "المدفوعات",
          results: payments.map((item) => ({
            id: `payment-${item.id}`,
            title: item.reference || item.invoice?.number || "دفعة",
            href: "/finance",
            subtitle: displayClient(item.client),
            badge: PAYMENT_METHOD_LABELS[item.method],
            meta: `${formatMoneyLabel(item.amount)} - ${formatDate(item.paidAt)}`,
          })),
        }))
    );

    jobs.push(
      prisma.judicialExpense
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { vendor: textFilter },
              { receiptUrl: textFilter },
              { notes: textFilter },
            ],
          },
          include: { case: { select: { title: true, caseNumber: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((expenses) => ({
          title: "المصروفات القضائية",
          results: expenses.map((item) => ({
            id: `expense-${item.id}`,
            title: item.title,
            href: "/finance",
            subtitle: item.case ? `${item.case.caseNumber} - ${item.case.title}` : item.vendor ?? undefined,
            badge: EXPENSE_STATUS_LABELS[item.status],
            badgeClass: EXPENSE_STATUS_COLORS[item.status],
            meta: formatMoneyLabel(item.amount),
          })),
        }))
    );
  }

  if (hasPermission(user.role, "templates.view")) {
    jobs.push(
      prisma.legalTemplate
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { body: textFilter },
              { variables: textFilter },
              { notes: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((templates) => ({
          title: "النماذج القانونية",
          results: templates.map((item) => ({
            id: `template-${item.id}`,
            title: item.title,
            href: "/templates",
            subtitle: item.notes ?? undefined,
            badge: LEGAL_TEMPLATE_CATEGORY_LABELS[item.category],
          })),
        }))
    );
  }

  if (hasPermission(user.role, "approvals.view")) {
    const canManageApprovals = hasPermission(user.role, "approvals.manage");
    jobs.push(
      prisma.approvalRequest
        .findMany({
          where: {
            AND: [
              canManageApprovals ? {} : { requestedById: user.id },
              {
                OR: [
                  { title: textFilter },
                  { entityType: textFilter },
                  { entityId: textFilter },
                  { reason: textFilter },
                  { decisionNote: textFilter },
                ],
              },
            ],
          },
          include: { requestedBy: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((requests) => ({
          title: "الموافقات",
          results: requests.map((item) => ({
            id: `approval-${item.id}`,
            title: item.title,
            href: "/approvals",
            subtitle: item.requestedBy?.name ?? undefined,
            badge: APPROVAL_STATUS_LABELS[item.status],
            meta: APPROVAL_TYPE_LABELS[item.type],
          })),
        }))
    );
  }

  if (hasPermission(user.role, "reminders.view")) {
    jobs.push(
      prisma.reminder
        .findMany({
          where: {
            OR: [
              { title: textFilter },
              { notes: textFilter },
              { link: textFilter },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        })
        .then((reminders) => ({
          title: "التنبيهات",
          results: reminders.map((item) => ({
            id: `reminder-${item.id}`,
            title: item.title,
            href: item.link ?? "/reminders",
            subtitle: formatDateTime(item.dueAt),
            badge: REMINDER_STATUS_LABELS[item.status],
            meta: item.notes ?? undefined,
          })),
        }))
    );
  }

  const response = compactGroups(await Promise.all(jobs));
  return { ...response, query };
}
