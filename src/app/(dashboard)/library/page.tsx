import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { LIBRARY_ENTRY_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { IconFileText, IconPen, IconSearch } from "@/components/icons";
import {
  deleteLibraryEntryFormAction,
  saveLibraryEntryFormAction,
} from "./actions";

export const metadata = { title: "المكتبة القانونية — نظام مكتب المحاماة" };

const types = Object.keys(LIBRARY_ENTRY_TYPE_LABELS);

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; type?: string }>;
}) {
  const user = await requirePermission("library.view");
  const canManage = hasPermission(user.role, "library.manage");
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const selectedType = types.includes(params.type ?? "") ? params.type ?? "" : "";

  const textFilter = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const entries = await prisma.legalLibraryEntry.findMany({
    where: {
      AND: [
        canManage ? {} : { isPublished: true },
        selectedType ? { type: selectedType as never } : {},
        textFilter
          ? {
              OR: [
                { title: textFilter },
                { summary: textFilter },
                { content: textFilter },
                { tags: textFilter },
                { jurisdiction: textFilter },
                { court: textFilter },
              ],
            }
          : {},
      ],
    },
    include: { createdBy: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const published = entries.filter((entry) => entry.isPublished).length;
  const forms = entries.filter((entry) => entry.type === "FORM").length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="المكتبة القانونية"
        subtitle="قاعدة معرفة داخلية للأحكام والمبادئ والإجراءات والصيغ المتكررة، مرتبطة بالبحث العام داخل المكتب."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مدخلات" value={entries.length} icon={<IconFileText />} />
        <StatCard label="منشورة للفريق" value={published} icon={<IconPen />} />
        <StatCard label="صيغ ونماذج" value={forms} icon={<IconFileText />} />
        <StatCard label="أنواع" value={types.length} icon={<IconSearch />} />
      </div>

      <form className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.025]">
        <div className="relative min-w-[240px] flex-1">
          <IconSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            className="field pr-9"
            placeholder="ابحث في العنوان، المحتوى، الوسوم، المحكمة..."
          />
        </div>
        <select name="type" defaultValue={selectedType} className="field w-full sm:w-56">
          <option value="">كل الأنواع</option>
          {types.map((type) => (
            <option key={type} value={type}>{LIBRARY_ENTRY_TYPE_LABELS[type]}</option>
          ))}
        </select>
        <button className="btn-primary" type="submit">بحث</button>
      </form>

      {canManage && (
        <section className="form-panel">
          <div className="form-heading">
            <div>
              <h2 className="form-title">إضافة مدخل للمكتبة</h2>
              <p className="form-subtitle">احفظ مبدأ، حكم، إجراء، أو صيغة متكررة يرجع لها الفريق.</p>
            </div>
          </div>
          <LibraryForm />
        </section>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={<IconFileText />} title="لا توجد مدخلات مطابقة" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {entries.map((entry) => (
            <article key={entry.id} className="form-panel">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">{entry.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {entry.createdBy?.name ?? "النظام"} - {formatDateTime(entry.updatedAt)}
                  </p>
                  {(entry.jurisdiction || entry.court || entry.tags) && (
                    <p className="mt-1 text-xs text-gray-500">
                      {[entry.jurisdiction, entry.court, entry.tags].filter(Boolean).join(" - ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-brand-50 text-brand-800">{LIBRARY_ENTRY_TYPE_LABELS[entry.type]}</Badge>
                  {!entry.isPublished && <Badge className="bg-gray-100 text-gray-600">مسودة</Badge>}
                </div>
              </div>

              {canManage ? (
                <LibraryForm
                  entry={{
                    id: entry.id,
                    title: entry.title,
                    type: entry.type,
                    summary: entry.summary,
                    content: entry.content,
                    tags: entry.tags,
                    jurisdiction: entry.jurisdiction,
                    court: entry.court,
                    sourceUrl: entry.sourceUrl,
                    isPublished: entry.isPublished,
                  }}
                  compact
                />
              ) : (
                <div className="space-y-3 text-sm leading-7 text-gray-700">
                  {entry.summary && <p className="font-semibold text-ink">{entry.summary}</p>}
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryForm({
  entry,
  compact = false,
}: {
  entry?: {
    id: string;
    title: string;
    type: string;
    summary: string | null;
    content: string;
    tags: string | null;
    jurisdiction: string | null;
    court: string | null;
    sourceUrl: string | null;
    isPublished: boolean;
  };
  compact?: boolean;
}) {
  return (
    <form action={saveLibraryEntryFormAction} className="form-grid">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <div className="sm:col-span-2">
        <label className="label">العنوان</label>
        <input name="title" required className="field" defaultValue={entry?.title ?? ""} />
      </div>
      <div>
        <label className="label">النوع</label>
        <select name="type" className="field" defaultValue={entry?.type ?? "NOTE"}>
          {types.map((type) => (
            <option key={type} value={type}>{LIBRARY_ENTRY_TYPE_LABELS[type]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">الوسوم</label>
        <input name="tags" className="field" defaultValue={entry?.tags ?? ""} placeholder="تجاري، عمالي، تنفيذ..." />
      </div>
      <div>
        <label className="label">الاختصاص / النظام</label>
        <input name="jurisdiction" className="field" defaultValue={entry?.jurisdiction ?? ""} />
      </div>
      <div>
        <label className="label">المحكمة / الجهة</label>
        <input name="court" className="field" defaultValue={entry?.court ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">ملخص مختصر</label>
        <textarea name="summary" rows={2} className="field" defaultValue={entry?.summary ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">المحتوى</label>
        <textarea name="content" required rows={compact ? 5 : 7} className="field" defaultValue={entry?.content ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">رابط المصدر</label>
        <input name="sourceUrl" dir="ltr" className="field" defaultValue={entry?.sourceUrl ?? ""} placeholder="https://..." />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
        <input name="isPublished" type="checkbox" defaultChecked={entry?.isPublished ?? true} />
        منشور للفريق
      </label>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className="btn-primary">{entry ? "حفظ التعديل" : "إضافة للمكتبة"}</button>
        {entry && (
          <button type="submit" formAction={deleteLibraryEntryFormAction} className="btn-danger">
            حذف
          </button>
        )}
      </div>
    </form>
  );
}
