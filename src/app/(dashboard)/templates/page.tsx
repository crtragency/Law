import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge } from "@/components/ui";
import { LEGAL_TEMPLATE_CATEGORY_LABELS, formatDateTime } from "@/lib/labels";
import { saveTemplateFormAction, saveTemplateOutputFormAction } from "./actions";

export const metadata = { title: "النماذج القانونية — نظام مكتب المحاماة" };

const CATEGORIES = Object.keys(LEGAL_TEMPLATE_CATEGORY_LABELS);

export default async function TemplatesPage() {
  const user = await requirePermission("templates.view");
  const canManage = hasPermission(user.role, "templates.manage");

  const [templates, outputs, clients, cases] = await Promise.all([
    prisma.legalTemplate.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } }),
    prisma.templateOutput.findMany({
      orderBy: { createdAt: "desc" },
      include: { template: { select: { title: true } }, client: true, case: { select: { title: true, caseNumber: true } } },
      take: 50,
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, companyName: true, type: true } }),
    prisma.case.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, caseNumber: true }, take: 200 }),
  ]);

  const clientOptions = clients.map((client) => ({
    id: client.id,
    name: client.type === "COMPANY" && client.companyName ? client.companyName : client.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="النماذج والصياغات القانونية" subtitle="قوالب مذكرات، إنذارات، خطابات، عقود، ولوائح قابلة لإعادة الاستخدام" />

      {canManage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={saveTemplateFormAction} className="form-panel space-y-4">
            <h2 className="form-title">نموذج جديد</h2>
            <input name="title" required className="field" placeholder="عنوان النموذج" />
            <select name="category" className="field" defaultValue="OTHER">
              {CATEGORIES.map((category) => <option key={category} value={category}>{LEGAL_TEMPLATE_CATEGORY_LABELS[category]}</option>)}
            </select>
            <input name="variables" className="field" placeholder="المتغيرات: clientName, caseNumber ..." dir="ltr" />
            <textarea name="body" required rows={10} className="field" placeholder="محتوى النموذج" />
            <textarea name="notes" rows={2} className="field" placeholder="ملاحظات داخلية" />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="isActive" defaultChecked /> نشط
            </label>
            <button type="submit" className="btn-primary">حفظ النموذج</button>
          </form>

          <form action={saveTemplateOutputFormAction} className="form-panel space-y-4">
            <h2 className="form-title">حفظ مستند من نموذج</h2>
            <input name="title" required className="field" placeholder="عنوان المستند" />
            <select name="templateId" className="field" defaultValue="">
              <option value="">بدون نموذج محدد</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
            </select>
            <select name="clientId" className="field" defaultValue="">
              <option value="">بدون موكّل</option>
              {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <select name="caseId" className="field" defaultValue="">
              <option value="">بدون قضية</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}
            </select>
            <textarea name="content" required rows={13} className="field" placeholder="الصياغة النهائية" />
            <button type="submit" className="btn-primary">حفظ المستند</button>
          </form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">مكتبة النماذج</h2>
          <div className="data-panel divide-y divide-gray-100">
            {templates.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">لا توجد نماذج بعد</p>
            ) : templates.map((template) => (
              <div key={template.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-gray-800">{template.title}</h3>
                    <p className="mt-1 text-xs text-gray-400">{template.createdBy?.name ?? "—"} — {formatDateTime(template.createdAt)}</p>
                  </div>
                  <Badge className={template.isActive ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-600"}>
                    {LEGAL_TEMPLATE_CATEGORY_LABELS[template.category]}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-gray-600">{template.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">المستندات المحفوظة</h2>
          <div className="data-panel divide-y divide-gray-100">
            {outputs.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">لا توجد مستندات مولدة بعد</p>
            ) : outputs.map((output) => (
              <div key={output.id} className="p-4">
                <h3 className="font-medium text-gray-800">{output.title}</h3>
                <p className="mt-1 text-xs text-gray-400">
                  {output.template?.title ?? "بدون نموذج"} — {formatDateTime(output.createdAt)}
                </p>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-gray-600">{output.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
