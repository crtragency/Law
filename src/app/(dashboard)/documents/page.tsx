import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { IconFileText, IconFolder, IconPaperclip, IconSearch } from "@/components/icons";
import { DocumentsManager } from "./documents-manager";

export const metadata = { title: "مركز الملفات — نظام مكتب المحاماة" };

export default async function DocumentsPage() {
  const user = await requirePermission("documents.view");
  const canManage = hasPermission(user, "documents.manage");

  const [documents, cases, total, publicCount, linkedCount, indexedCount] = await Promise.all([
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        uploadedBy: { select: { name: true } },
      },
      take: 300,
    }),
    prisma.case.findMany({
      where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
      take: 300,
    }),
    prisma.document.count(),
    prisma.document.count({ where: { visibility: "PORTAL" } }),
    prisma.document.count({ where: { caseId: { not: null } } }),
    prisma.document.count({ where: { ocrStatus: "INDEXED" } }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="مركز الملفات"
        subtitle="ارفع ملفات المكتب من جهازك، اربطها بالقضايا، وخليها قابلة للبحث والتنزيل الآمن."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="كل الملفات" value={total} icon={<IconFileText />} />
        <StatCard label="مرتبطة بقضايا" value={linkedCount} icon={<IconFolder />} />
        <StatCard label="ظاهرة للعميل" value={publicCount} icon={<IconPaperclip />} />
        <StatCard label="مفهرسة في البحث" value={indexedCount} icon={<IconSearch />} />
      </div>

      <DocumentsManager
        canManage={canManage}
        cases={cases.map((item) => ({
          id: item.id,
          title: item.title,
          caseNumber: item.caseNumber,
        }))}
        rows={documents.map((item) => ({
          id: item.id,
          title: item.title,
          fileName: item.fileName,
          storageKey: item.storageKey,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          category: item.category,
          tags: item.tags,
          visibility: item.visibility,
          expiresAt: item.expiresAt?.toISOString() ?? null,
          notes: item.notes,
          ocrStatus: item.ocrStatus,
          extractedText: item.extractedText,
          createdAt: item.createdAt.toISOString(),
          uploaderName: item.uploadedBy?.name ?? null,
          caseId: item.caseId,
          caseTitle: item.case?.title ?? null,
          caseNumber: item.case?.caseNumber ?? null,
        }))}
      />
    </div>
  );
}
