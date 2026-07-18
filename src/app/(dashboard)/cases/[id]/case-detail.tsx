"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CaseForm, type CaseFormValues } from "../case-form";
import {
  addCaseNoteAction,
  addDocumentAction,
  deleteDocumentAction,
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

export function DocumentsSection({
  caseId,
  documents,
  canManage,
}: {
  caseId: string;
  documents: DocItem[];
  canManage: boolean;
}) {
  const [addState, addAction] = useActionState(addDocumentAction, EMPTY);
  return (
    <div className="card">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <IconPaperclip className="h-5 w-5 text-brand-600" /> المستندات
      </h3>
      {canManage && (
        <form action={addAction} className="mb-4 grid gap-2 sm:grid-cols-2">
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
            placeholder="رابط المستند (Drive / سحابة المكتب)"
          />
          <div className="sm:col-span-2">
            {addState.error && (
              <p className="mb-2 text-sm text-red-600">{addState.error}</p>
            )}
            <Submit label="إضافة مستند" />
          </div>
        </form>
      )}
      <div className="divide-y divide-gray-100">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مستندات مرفقة</p>
        ) : (
          documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2">
              <div>
                <a
                  href={d.storageKey}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                >
                  <IconFileText className="h-4 w-4 shrink-0 text-gray-400" />
                  {d.title}
                </a>
                <p className="text-xs text-gray-400">
                  {d.uploaderName ?? "—"} — {formatDateTime(d.createdAt)}
                </p>
              </div>
              {canManage && <DeleteDoc id={d.id} caseId={caseId} />}
            </div>
          ))
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
