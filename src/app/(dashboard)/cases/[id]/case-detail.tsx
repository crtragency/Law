"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CaseForm, type CaseFormValues } from "../case-form";
import {
  addCaseNoteAction,
  addDocumentAction,
  deleteDocumentAction,
  createUploadUrlAction,
  registerUploadedDocumentAction,
  type ActionResult,
} from "../actions";
import { formatDateTime } from "@/lib/labels";
import {
  IconPen,
  IconPaperclip,
  IconFileText,
  IconMessage,
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
interface DocItem {
  id: string;
  title: string;
  storageKey: string;
  fileName: string;
  uploaderName: string | null;
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
    <div className="card">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <IconMessage className="h-5 w-5 text-brand-600" /> ملاحظات الفريق
      </h3>
      <form action={action} className="mb-4 space-y-2">
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
            <div key={n.id} className="rounded-lg bg-gray-50 p-3">
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

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export function DocumentsSection({
  caseId,
  documents,
  canManage,
}: {
  caseId: string;
  documents: DocItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [addState, addAction] = useActionState(addDocumentAction, EMPTY);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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
        title: titleRef.current?.value.trim() || file.name,
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
      setUploadOk(true);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <IconPaperclip className="h-5 w-5 text-brand-600" /> المستندات
      </h3>

      {canManage && (
        <div className="mb-5 rounded-md border border-line bg-paper/60 p-3">
          <div className="mb-3 flex rounded-md border border-line bg-white p-0.5 text-sm font-medium">
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
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                ref={titleRef}
                className="field"
                placeholder="اسم المستند (اختياري — الافتراضي اسم الملف)"
              />
              <input
                ref={fileRef}
                type="file"
                className="field file:ml-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-700"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
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
            <form action={addAction} className="grid gap-2 sm:grid-cols-2">
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
                  <p className="text-xs text-gray-400">
                    {d.uploaderName ?? "—"} — {formatDateTime(d.createdAt)}
                  </p>
                </div>
                {canManage && <DeleteDoc id={d.id} caseId={caseId} />}
              </div>
            );
          })
        )}
      </div>
    </div>
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
