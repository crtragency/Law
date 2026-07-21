"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CaseForm, type CaseFormValues } from "../case-form";
import {
  addCaseMessageAction,
  addCaseNoteAction,
  addDocumentAction,
  deleteDocumentAction,
  createUploadUrlAction,
  reindexDocumentAction,
  registerUploadedDocumentAction,
  requestDocumentFromClientAction,
  updateDocumentRequestStatusAction,
  type ActionResult,
} from "../actions";
import {
  DOCUMENT_OCR_STATUS_COLORS,
  DOCUMENT_OCR_STATUS_LABELS,
  DOCUMENT_REQUEST_STATUS_COLORS,
  DOCUMENT_REQUEST_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { Badge } from "@/components/ui";
import {
  IconPen,
  IconPaperclip,
  IconFileText,
  IconMessage,
  IconSend,
} from "@/components/icons";

const EMPTY: ActionResult = { ok: false };

interface Option {
  id: string;
  name: string;
}
interface NoteItem {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}
interface CaseMessageItem {
  id: string;
  body: string;
  authorType: "STAFF" | "CLIENT";
  authorName: string;
  createdAt: string;
}
interface DocItem {
  id: string;
  title: string;
  storageKey: string;
  fileName: string;
  category: string | null;
  visibility: string;
  expiresAt: string | null;
  notes: string | null;
  extractedText: string | null;
  ocrStatus: string;
  uploaderName: string | null;
  createdAt: string;
}
interface DocumentRequestItem {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  dueDate: string | null;
  status: string;
  createdByName: string | null;
  createdAt: string;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export function CaseEditSection({
  values,
  clients,
  lawyers,
  canManage,
}: {
  values: CaseFormValues;
  clients: Option[];
  lawyers: Option[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (!canManage) return null;
  return editing ? (
    <CaseForm
      values={values}
      clients={clients}
      lawyers={lawyers}
      onDone={() => setEditing(false)}
      onCancel={() => setEditing(false)}
    />
  ) : (
    <button onClick={() => setEditing(true)} className="btn-secondary">
      <IconPen className="h-4 w-4" /> تعديل القضية
    </button>
  );
}

export function NotesSection({
  caseId,
  notes,
}: {
  caseId: string;
  notes: NoteItem[];
}) {
  const [state, action] = useActionState(addCaseNoteAction, EMPTY);
  return (
    <div className="form-panel">
      <h3 className="mb-5 flex items-center gap-2 font-display text-xl font-bold">
        <IconMessage className="h-5 w-5 text-brand-600" /> ملاحظات الفريق
      </h3>
      <form action={action} className="mb-5 space-y-3">
        <input type="hidden" name="caseId" value={caseId} />
        <textarea
          name="body"
          rows={2}
          required
          className="field"
          placeholder="اكتب ملاحظة أو تحديثاً لباقي الفريق..."
        />
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <Submit label="إضافة ملاحظة" />
      </form>
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد ملاحظات بعد</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-2xl bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {n.body}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {n.authorName ?? "مستخدم محذوف"} — {formatDateTime(n.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CaseConversationSection({
  caseId,
  messages,
}: {
  caseId: string;
  messages: CaseMessageItem[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addCaseMessageAction, EMPTY);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="form-panel">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-xl font-bold">
            <IconMessage className="h-5 w-5 text-brand-600" /> محادثة العميل
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            الرسائل هنا ظاهرة للعميل داخل بوابته، بخلاف ملاحظات الفريق الداخلية.
          </p>
        </div>
        <span className="badge bg-brand-50 text-brand-800">{messages.length} رسالة</span>
      </div>

      <div className="mb-5 max-h-[460px] space-y-3 overflow-y-auto rounded-2xl border border-line bg-paper/60 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500">لا توجد رسائل مع العميل بعد</p>
        ) : (
          messages.map((message) => {
            const fromStaff = message.authorType === "STAFF";
            return (
              <div
                key={message.id}
                className={`flex ${fromStaff ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                    fromStaff
                      ? "border-brand-100 bg-brand-50/80 text-brand-950"
                      : "border-line bg-white text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-7">{message.body}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {message.authorName} - {formatDateTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form ref={formRef} action={action} className="space-y-3">
        <input type="hidden" name="caseId" value={caseId} />
        <textarea
          name="body"
          rows={3}
          required
          className="field"
          placeholder="اكتب رسالة للعميل عن التحديث أو المستند أو الموعد..."
        />
        {state.error && <p className="text-sm text-seal-600">{state.error}</p>}
        {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
        <Submit label="إرسال للعميل" />
      </form>
    </div>
  );
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export function DocumentsSection({
  caseId,
  documents,
  documentRequests,
  canManage,
}: {
  caseId: string;
  documents: DocItem[];
  documentRequests: DocumentRequestItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [addState, addAction] = useActionState(addDocumentAction, EMPTY);
  const [requestState, requestAction] = useActionState(requestDocumentFromClientAction, EMPTY);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const visibilityRef = useRef<HTMLSelectElement>(null);
  const expiresAtRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const extractedTextRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<HTMLSelectElement>(null);
  const openDocumentRequests = documentRequests.filter((request) => request.status === "REQUESTED");

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    setUploadOk(false);
    if (!file) {
      setUploadError("اختر ملفاً أولاً");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("أقصى حجم للملف 50 ميجابايت");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      // 1) تجهيز رابط رفع موقّع من الخادم.
      const prep = await createUploadUrlAction({
        caseId,
        fileName: file.name,
      });
      if (!prep.ok) {
        setUploadError(prep.error);
        return;
      }
      // 2) رفع الملف مباشرة إلى التخزين الخاص.
      const put = await fetch(prep.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!put.ok) {
        setUploadError("فشل رفع الملف — حاول مجدداً");
        return;
      }
      // 3) تسجيل المستند في قاعدة البيانات.
      const reg = await registerUploadedDocumentAction({
        caseId,
        requestId: requestRef.current?.value || undefined,
        title: titleRef.current?.value.trim() || file.name,
        category: categoryRef.current?.value.trim() || undefined,
        visibility: (visibilityRef.current?.value as "INTERNAL" | "PORTAL" | undefined) || "PORTAL",
        expiresAt: expiresAtRef.current?.value || undefined,
        notes: notesRef.current?.value.trim() || undefined,
        extractedText: extractedTextRef.current?.value.trim() || undefined,
        storageKey: prep.storageKey,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      });
      if (!reg.ok) {
        setUploadError(reg.error ?? "تعذّر حفظ المستند");
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      if (titleRef.current) titleRef.current.value = "";
      if (categoryRef.current) categoryRef.current.value = "";
      if (visibilityRef.current) visibilityRef.current.value = "PORTAL";
      if (expiresAtRef.current) expiresAtRef.current.value = "";
      if (notesRef.current) notesRef.current.value = "";
      if (extractedTextRef.current) extractedTextRef.current.value = "";
      if (requestRef.current) requestRef.current.value = "";
      setUploadOk(true);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="form-panel">
      <h3 className="mb-5 flex items-center gap-2 font-display text-xl font-bold">
        <IconPaperclip className="h-5 w-5 text-brand-600" /> المستندات
      </h3>

      {canManage && (
        <div className="mb-6 rounded-2xl border border-line bg-paper/70 p-4">
          <form action={requestAction} className="mb-5 rounded-2xl border border-brand-100 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
              <IconSend className="h-5 w-5 text-brand-600" />
              طلب مستند من العميل
            </div>
            <input type="hidden" name="caseId" value={caseId} />
            <div className="form-grid">
              <input name="title" required className="field" placeholder="اسم المستند المطلوب" />
              <input name="category" className="field" placeholder="التصنيف: هوية / توكيل / إيصال..." />
              <input name="dueDate" type="date" className="field" />
              <textarea
                name="description"
                rows={2}
                className="field sm:col-span-2"
                placeholder="تعليمات مختصرة للعميل..."
              />
            </div>
            {requestState.error && <p className="mt-2 text-sm text-seal-600">{requestState.error}</p>}
            {requestState.success && <p className="mt-2 text-sm text-brand-700">{requestState.success}</p>}
            <div className="mt-3">
              <Submit label="طلب المستند" />
            </div>
          </form>

          <div className="mb-4 flex rounded-xl border border-line bg-white p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex-1 rounded px-3 py-1 transition ${
                mode === "upload"
                  ? "bg-brand-700 text-white"
                  : "text-gray-600 hover:text-ink"
              }`}
            >
              رفع ملف من الجهاز
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`flex-1 rounded px-3 py-1 transition ${
                mode === "link"
                  ? "bg-brand-700 text-white"
                  : "text-gray-600 hover:text-ink"
              }`}
            >
              إضافة رابط خارجي
            </button>
          </div>

          {mode === "upload" ? (
            <div className="form-grid">
              {openDocumentRequests.length > 0 && (
                <select ref={requestRef} className="field sm:col-span-2" defaultValue="">
                  <option value="">ربط الرفع بطلب مستند مفتوح؟</option>
                  {openDocumentRequests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.title}
                    </option>
                  ))}
                </select>
              )}
              <input
                ref={titleRef}
                className="field"
                placeholder="اسم المستند (اختياري — الافتراضي اسم الملف)"
              />
              <input
                ref={categoryRef}
                className="field"
                placeholder="التصنيف: هوية / توكيل / إيصال..."
              />
              <select ref={visibilityRef} className="field" defaultValue="PORTAL">
                <option value="PORTAL">ظاهر للعميل</option>
                <option value="INTERNAL">داخلي فقط</option>
              </select>
              <input ref={expiresAtRef} type="date" className="field" />
              <input
                ref={fileRef}
                type="file"
                className="field sm:col-span-2 file:ml-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-700"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
              />
              <textarea
                ref={notesRef}
                rows={2}
                className="field sm:col-span-2"
                placeholder="ملاحظات داخلية أو تعليمات عن المستند..."
              />
              <textarea
                ref={extractedTextRef}
                rows={4}
                className="field sm:col-span-2"
                placeholder="نص المستند المقروء أو المستخرج OCR ليظهر في البحث العام..."
              />
              <div className="sm:col-span-2">
                {uploadError && (
                  <p className="mb-2 text-sm text-seal-600">{uploadError}</p>
                )}
                {uploadOk && (
                  <p className="mb-2 text-sm text-brand-700">تم رفع المستند بنجاح</p>
                )}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "جارٍ الرفع..." : "رفع المستند"}
                </button>
                <span className="mr-3 text-xs text-gray-400">
                  حتى 50 ميجابايت — PDF، صور، Word، Excel
                </span>
              </div>
            </div>
          ) : (
            <form action={addAction} className="form-grid">
              <input type="hidden" name="caseId" value={caseId} />
              <input
                name="title"
                required
                className="field"
                placeholder="اسم المستند (مثال: صحيفة الدعوى)"
              />
              <input
                name="storageKey"
                required
                className="field"
                dir="ltr"
                placeholder="https://... رابط المستند"
              />
              <input
                name="category"
                className="field"
                placeholder="التصنيف: هوية / توكيل / إيصال..."
              />
              <select name="visibility" className="field" defaultValue="PORTAL">
                <option value="PORTAL">ظاهر للعميل</option>
                <option value="INTERNAL">داخلي فقط</option>
              </select>
              <input name="expiresAt" type="date" className="field" />
              <textarea
                name="notes"
                rows={2}
                className="field sm:col-span-2"
                placeholder="ملاحظات عن المستند..."
              />
              <textarea
                name="extractedText"
                rows={4}
                className="field sm:col-span-2"
                placeholder="نص المستند المقروء أو المستخرج OCR ليظهر في البحث العام..."
              />
              <div className="sm:col-span-2">
                {addState.error && (
                  <p className="mb-2 text-sm text-seal-600">{addState.error}</p>
                )}
                <Submit label="إضافة الرابط" />
              </div>
            </form>
          )}
        </div>
      )}

      {documentRequests.length > 0 && (
        <div className="mb-6 rounded-2xl border border-line bg-white">
          <div className="border-b border-line p-4">
            <h4 className="font-display text-lg font-bold text-ink">المستندات المطلوبة</h4>
            <p className="mt-1 text-sm text-gray-500">
              الطلبات المفتوحة تظهر للعميل في البوابة ويمكن ربط الرفع بها.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {documentRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">{request.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {request.category ?? "مستند عام"}
                    {request.dueDate ? ` - استحقاق ${formatDate(request.dueDate)}` : ""}
                    {request.createdByName ? ` - بواسطة ${request.createdByName}` : ""}
                  </p>
                  {request.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                      {request.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={DOCUMENT_REQUEST_STATUS_COLORS[request.status]}>
                    {DOCUMENT_REQUEST_STATUS_LABELS[request.status]}
                  </Badge>
                  {canManage && (
                    <DocumentRequestStatusForm
                      id={request.id}
                      caseId={caseId}
                      currentStatus={request.status}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مستندات مرفقة</p>
        ) : (
          documents.map((d) => {
            const isExternal = /^https?:\/\//i.test(d.storageKey);
            const href = isExternal ? d.storageKey : `/api/documents/${d.id}`;
            return (
              <div key={d.id} className="flex items-center justify-between py-2">
                <div>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                  >
                    <IconFileText className="h-4 w-4 shrink-0 text-gray-400" />
                    {d.title}
                    {isExternal && (
                      <span className="text-[10px] text-gray-400">(رابط)</span>
                    )}
                  </a>
                  <p className="mt-1 text-xs text-gray-400">
                    {d.category ?? "بدون تصنيف"} — {d.visibility === "PORTAL" ? "ظاهر للعميل" : "داخلي فقط"} —{" "}
                    {d.uploaderName ?? "—"} — {formatDateTime(d.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className={DOCUMENT_OCR_STATUS_COLORS[d.ocrStatus] ?? "bg-gray-100 text-gray-600"}>
                      {DOCUMENT_OCR_STATUS_LABELS[d.ocrStatus] ?? d.ocrStatus}
                    </Badge>
                    {d.extractedText && (
                      <span className="max-w-xl truncate text-xs text-gray-500">
                        مفهرس: {d.extractedText.slice(0, 90)}{d.extractedText.length > 90 ? "..." : ""}
                      </span>
                    )}
                  </div>
                  {d.expiresAt && (
                    <p className="mt-1 text-xs font-semibold text-brass-700">
                      ينتهي في {formatDate(d.expiresAt)}
                    </p>
                  )}
                  {d.notes && <p className="mt-1 text-sm text-gray-500">{d.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <ReindexDoc id={d.id} caseId={caseId} />
                    <DeleteDoc id={d.id} caseId={caseId} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReindexDoc({ id, caseId }: { id: string; caseId: string }) {
  const [, action] = useActionState(reindexDocumentAction, EMPTY);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="caseId" value={caseId} />
      <button type="submit" className="text-sm font-medium text-brand-700 hover:underline">
        فهرسة
      </button>
    </form>
  );
}

function DeleteDoc({ id, caseId }: { id: string; caseId: string }) {
  const [, action] = useActionState(deleteDocumentAction, EMPTY);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("حذف هذا المستند؟")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="caseId" value={caseId} />
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:underline"
      >
        حذف
      </button>
    </form>
  );
}

function DocumentRequestStatusForm({
  id,
  caseId,
  currentStatus,
}: {
  id: string;
  caseId: string;
  currentStatus: string;
}) {
  const [, action] = useActionState(updateDocumentRequestStatusAction, EMPTY);
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="caseId" value={caseId} />
      <select name="status" className="field h-9 w-36 py-1 text-xs" defaultValue={currentStatus}>
        {Object.entries(DOCUMENT_REQUEST_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">
        حفظ
      </button>
    </form>
  );
}
