"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { IconFileText, IconPaperclip, IconTrash } from "@/components/icons";
import {
  DOCUMENT_OCR_STATUS_COLORS,
  DOCUMENT_OCR_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import {
  createGeneralDocumentUploadUrlAction,
  deleteGeneralDocumentFormAction,
  registerGeneralDocumentAction,
} from "./actions";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

interface CaseOption {
  id: string;
  title: string;
  caseNumber: string;
}

interface DocumentRow {
  id: string;
  title: string;
  fileName: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  category: string | null;
  tags: string | null;
  visibility: string;
  expiresAt: string | null;
  notes: string | null;
  ocrStatus: string;
  extractedText: string | null;
  createdAt: string;
  uploaderName: string | null;
  caseId: string | null;
  caseTitle: string | null;
  caseNumber: string | null;
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-danger px-3 py-1.5 text-xs" disabled={pending}>
      <IconTrash className="h-4 w-4" />
      {pending ? "..." : "حذف"}
    </button>
  );
}

function fileSize(size: number | null) {
  if (!size) return "غير محدد";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsManager({
  rows,
  cases,
  canManage,
}: {
  rows: DocumentRow[];
  cases: CaseOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const caseRef = useRef<HTMLSelectElement>(null);
  const visibilityRef = useRef<HTMLSelectElement>(null);
  const expiresAtRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const extractedTextRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    setMessage(null);
    if (!file) {
      setMessage("اختار ملف الأول");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage("أقصى حجم للملف 50 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const prep = await createGeneralDocumentUploadUrlAction({ fileName: file.name });
      if (!prep.ok) {
        setMessage(prep.error);
        return;
      }
      const put = await fetch(prep.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) {
        setMessage("فشل رفع الملف، جرب تاني");
        return;
      }
      const result = await registerGeneralDocumentAction({
        title: titleRef.current?.value.trim() || file.name,
        storageKey: prep.storageKey,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
        category: categoryRef.current?.value.trim() || undefined,
        tags: tagsRef.current?.value.trim() || undefined,
        caseId: caseRef.current?.value || undefined,
        visibility: (visibilityRef.current?.value as "INTERNAL" | "PORTAL" | undefined) || "INTERNAL",
        expiresAt: expiresAtRef.current?.value || undefined,
        notes: notesRef.current?.value.trim() || undefined,
        extractedText: extractedTextRef.current?.value.trim() || undefined,
      });
      if (!result.ok) {
        setMessage(result.error ?? "تعذر حفظ الملف");
        return;
      }

      [fileRef, titleRef, categoryRef, tagsRef, expiresAtRef].forEach((ref) => {
        if (ref.current) ref.current.value = "";
      });
      if (caseRef.current) caseRef.current.value = "";
      if (visibilityRef.current) visibilityRef.current.value = "INTERNAL";
      if (notesRef.current) notesRef.current.value = "";
      if (extractedTextRef.current) extractedTextRef.current.value = "";
      setMessage(result.success ?? "تم رفع الملف");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="documents-layout">
      {canManage && (
        <section className="form-panel h-fit space-y-4">
          <div className="form-heading">
            <div>
              <h2 className="form-title">رفع ملف من الجهاز</h2>
              <p className="form-subtitle">ارفع PDF أو صور أو Word أو Excel أو أي ملف عمل، واربطه بقضية لو محتاج.</p>
            </div>
          </div>

          <div className="space-y-4">
            <input ref={titleRef} className="field" placeholder="عنوان الملف" />
            <input ref={categoryRef} className="field" placeholder="التصنيف: عقد / هوية / فاتورة / محضر..." />
            <input ref={tagsRef} className="field" placeholder="وسوم للبحث: تنفيذ، تجاري، عميل..." />
            <select ref={caseRef} className="field" defaultValue="">
              <option value="">بدون ربط بقضية</option>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.caseNumber} - {item.title}
                </option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <select ref={visibilityRef} className="field" defaultValue="INTERNAL">
                <option value="INTERNAL">داخلي فقط</option>
                <option value="PORTAL">ظاهر للعميل لو مربوط بقضية</option>
              </select>
              <input ref={expiresAtRef} type="date" className="field" />
            </div>
            <input
              ref={fileRef}
              type="file"
              className="field file:ml-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-brand-700"
            />
            <textarea ref={notesRef} rows={3} className="field" placeholder="ملاحظات عن الملف..." />
            <textarea
              ref={extractedTextRef}
              rows={4}
              className="field"
              placeholder="نص يدوي للبحث لو الملف صورة أو Scan..."
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleUpload} disabled={uploading} className="btn-primary">
                <IconPaperclip className="h-4 w-4" />
                {uploading ? "جاري الرفع..." : "رفع الملف"}
              </button>
              <span className="text-xs text-gray-500">حتى 50 ميجابايت لكل ملف</span>
            </div>
            {message && <p className="text-sm font-semibold text-brand-700">{message}</p>}
          </div>
        </section>
      )}

      <section className="data-panel">
        <div className="border-b border-line p-4">
          <h2 className="font-display text-xl font-bold text-ink">كل الملفات المرفوعة</h2>
          <p className="mt-1 text-sm text-gray-500">كل ملفات المكتب في مكان واحد، مع تنزيل آمن وربط اختياري بالقضايا.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">لا توجد ملفات مرفوعة بعد</p>
          ) : (
            rows.map((item) => {
              const isExternal = /^https?:\/\//i.test(item.storageKey);
              const href = isExternal ? item.storageKey : `/api/documents/${item.id}`;
              return (
                <article key={item.id} className="surface-hover flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-2 font-display text-lg font-bold text-brand-800 hover:underline"
                    >
                      <IconFileText className="h-5 w-5 shrink-0 text-brand-600" />
                      <span className="truncate">{item.title}</span>
                    </a>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.fileName} - {fileSize(item.sizeBytes)} - {item.uploaderName ?? "النظام"} - {formatDateTime(item.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={item.visibility === "PORTAL" ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-700"}>
                        {item.visibility === "PORTAL" ? "ظاهر للعميل" : "داخلي"}
                      </Badge>
                      <Badge className={DOCUMENT_OCR_STATUS_COLORS[item.ocrStatus] ?? "bg-gray-100 text-gray-700"}>
                        {DOCUMENT_OCR_STATUS_LABELS[item.ocrStatus] ?? item.ocrStatus}
                      </Badge>
                      {item.category && <Badge className="bg-brass-50 text-brass-800">{item.category}</Badge>}
                      {item.caseId && (
                        <a href={`/cases/${item.caseId}`} className="badge bg-brand-900 text-white hover:bg-brand-800">
                          {item.caseNumber} - {item.caseTitle}
                        </a>
                      )}
                    </div>
                    {item.tags && <p className="mt-2 text-xs text-gray-500">وسوم: {item.tags}</p>}
                    {item.expiresAt && <p className="mt-1 text-xs font-semibold text-brass-700">ينتهي في {formatDate(item.expiresAt)}</p>}
                    {item.notes && <p className="mt-2 text-sm leading-7 text-gray-600">{item.notes}</p>}
                    {item.extractedText && (
                      <p className="mt-2 line-clamp-2 text-xs leading-6 text-gray-400">
                        مفهرس: {item.extractedText}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <form
                      action={deleteGeneralDocumentFormAction}
                      onSubmit={(event) => {
                        if (!confirm("حذف هذا الملف؟")) event.preventDefault();
                      }}
                      className="shrink-0"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <DeleteButton />
                    </form>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
