import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ContactsManager } from "./contacts-manager";

export const metadata = { title: "جهات الاتصال — نظام مكتب المحاماة" };

export default async function ContactsPage() {
  const user = await requirePermission("contacts.view");
  const canManage = hasPermission(user.role, "contacts.manage");

  const [contacts, clients, cases] = await Promise.all([
    prisma.legalContact.findMany({
      orderBy: { createdAt: "desc" },
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
        title="جهات الاتصال القانونية"
        subtitle="محاكم، جهات حكومية، خبراء، خصوم، محامون، ومزودو خدمات"
      />
      <ContactsManager
        canManage={canManage}
        contacts={contacts.map((contact) => ({
          id: contact.id,
          type: contact.type,
          name: contact.name,
          organization: contact.organization,
          roleTitle: contact.roleTitle,
          phone: contact.phone,
          email: contact.email,
          clientName: contact.client
            ? contact.client.type === "COMPANY" && contact.client.companyName
              ? contact.client.companyName
              : contact.client.name
            : null,
          caseTitle: contact.case?.title ?? null,
          caseNumber: contact.case?.caseNumber ?? null,
        }))}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.type === "COMPANY" && client.companyName ? client.companyName : client.name,
        }))}
        cases={cases.map((c) => ({
          id: c.id,
          name: c.title,
          caseNumber: c.caseNumber,
        }))}
      />
    </div>
  );
}
