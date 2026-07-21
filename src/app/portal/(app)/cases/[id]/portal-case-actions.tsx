"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPortalCaseRequestAction,
  createPortalCaseUploadUrlAction,
  registerPortalCaseDocumentAction,
  type PortalActionResult,
} from "./actions";
import { IconPaperclip, IconSend } from "@/components/icons";

const EMPTY: PortalActionResult = { ok: false };
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

interface DocumentRequestOption {
  id: string;
  title: string;
  category: string | null;
}

export function PortalCaseActions({
  caseId,
  documentRequests,
}: {
  caseId: string;
  documentRequests: DocumentRequestOption[];
}) {
  const [state, action] = useActionState(createPortalCaseRequestAction, EMPTY);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form action={action} className="form-panel h-fit space-y-4">
        <div>
          <h2 className="section-title">طلب من المكتب</h2>
          <p className="mt-1 text-sm text-gray-500">
            ابعت استفسار، طلب تحديث، موعد مقابلة، أو بلّغ المكتب إنك هترسل مستند.
          </p>
        </div>
        <input type="hidden" name="caseId" value={caseId} />
        <div className="form-grid">
          <div>
            <label className="label">نوع الطلب</label>
            <select name="requestType" className="field" defaultValue="UPDATE_REQUEST">
              <option value="UPDATE_REQUEST">طلب تحديث</option>
              <option value="MEETING_REQUEST">طلب مقابلة</option>
              <option value="QUESTION">استفسار قانوني</option>
              <option value="DOCUMENT_UPLOAD">متابعة مستند</option>
            </select>
          </div>
          <div>
            <label className="label">العنوان</label>
            <input name="title" required className="field" placeholder="مثال: أحتاج تحديث عن الجلسة القادمة" />
          </div>
        </div>
        <div>
          <label className="label">التفاصيل</label>
          <textarea name="description" required rows={4} className="field" placeholder="اكتب طلبك بوضوح..." />
        </div>
        {state.error && <p className="text-sm text-seal-600">{state.error}</p>}
        {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
        <button type="submit" className="btn-primary">
          <IconSend className="h-4 w-4" />
          إرسال الطلب
        </button>
      </form>

      <PortalDocumentUpload caseId={caseId} documentRequests={documentRequests} />
    </div>
  );
}

function PortalDocumentUpload({
  caseId,
  documentRequests,
}: {
  caseId: string;
  documentRequests: DocumentRequestOption[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<HTMLSelectElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<PortalActionResult>(EMPTY);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    setMessage(EMPTY);
    if (!file) {
      setMessage({ ok: false, error: "اختر ملفاً أولاً" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage({ ok: false, error: "أقصى حجم للملف 50 ميجابايت" });
      return;
    }

    setPending(true);
    try {
      const prep = await createPortalCaseUploadUrlAction({ caseId, fileName: file.name });
      if (!prep.ok) {
        setMessage(prep);
        return;
      }
      const put = await fetch(prep.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) {
        setMessage({ ok: false, error: "فشل رفع الملف، حاول مرة أخرى" });
        return;
      }
      const result = await registerPortalCaseDocumentAction({
        caseId,
        requestId: requestRef.current?.value || undefined,
        title: titleRef.current?.value.trim() || file.name,
        category: categoryRef.current?.value.trim() || undefined,
        notes: notesRef.current?.value.trim() || undefined,
        storageKey: prep.storageKey,
        fileName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      });
      setMessage(result);
      if (result.ok) {
        if (fileRef.current) fileRef.current.value = "";
        if (titleRef.current) titleRef.current.value = "";
        if (categoryRef.current) categoryRef.current.value = "";
        if (notesRef.current) notesRef.current.value = "";
        if (requestRef.current) requestRef.current.value = "";
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-panel h-fit space-y-4">
      <div>
        <h2 className="section-title">رفع مستند</h2>
        <p className="mt-1 text-sm text-gray-500">
          ارفع مستند مرتبط بالقضية، وسيظهر للمكتب فوراً كطلب متابعة.
        </p>
      </div>
      {documentRequests.length > 0 && (
        <div>
          <label className="label">رد على مستند مطلوب</label>
          <select ref={requestRef} className="field" defaultValue="">
            <option value="">رفع عام بدون ربط بطلب</option>
            {documentRequests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.title}
                {request.category ? ` - ${request.category}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-grid">
        <div>
          <label className="label">اسم المستند</label>
          <input ref={titleRef} className="field" placeholder="مثال: صورة الهوية" />
        </div>
        <div>
          <label className="label">التصنيف</label>
          <input ref={categoryRef} className="field" placeholder="هوية / توكيل / إيصال / مستند قضية" />
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="field file:ml-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-700"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
      />
      <textarea ref={notesRef} rows={2} className="field" placeholder="ملاحظات اختيارية للمكتب..." />
      {message.error && <p className="text-sm text-seal-600">{message.error}</p>}
      {message.success && <p className="text-sm text-brand-700">{message.success}</p>}
      <button type="button" onClick={upload} disabled={pending} className="btn-primary">
        <IconPaperclip className="h-4 w-4" />
        {pending ? "جار الرفع..." : "رفع المستند"}
      </button>
    </div>
  );
}
