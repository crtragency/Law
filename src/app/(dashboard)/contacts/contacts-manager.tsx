"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui";
import { CONTACT_TYPE_LABELS } from "@/lib/labels";
import { deleteContactAction, saveContactAction, type ActionResult } from "./actions";
import { IconPlus, IconTrash } from "@/components/icons";

const EMPTY: ActionResult = { ok: false };
const CONTACT_TYPES = Object.keys(CONTACT_TYPE_LABELS);

interface Option {
  id: string;
  name: string;
}

interface CaseOption extends Option {
  caseNumber: string;
}

export interface ContactRow {
  id: string;
  type: string;
  name: string;
  organization: string | null;
  roleTitle: string | null;
  phone: string | null;
  email: string | null;
  clientName: string | null;
  caseTitle: string | null;
  caseNumber: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      <IconPlus className="h-4 w-4" /> {pending ? "جار الحفظ..." : "إضافة جهة"}
    </button>
  );
}

export function ContactsManager({
  contacts,
  clients,
  cases,
  canManage,
}: {
  contacts: ContactRow[];
  clients: Option[];
  cases: CaseOption[];
  canManage: boolean;
}) {
  const [state, action] = useActionState(saveContactAction, EMPTY);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {canManage && (
        <form action={action} className="card h-fit space-y-3">
          <h2 className="font-display text-lg font-bold">جهة جديدة</h2>
          <div>
            <label className="label">نوع الجهة</label>
            <select name="type" className="field" defaultValue="OTHER">
              {CONTACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTACT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الاسم</label>
            <input name="name" required className="field" placeholder="اسم الجهة أو الشخص" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="organization" className="field" placeholder="المنظمة" />
            <input name="roleTitle" className="field" placeholder="الصفة" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="phone" className="field" placeholder="الهاتف" dir="ltr" />
            <input name="email" className="field" placeholder="البريد" dir="ltr" />
          </div>
          <input name="address" className="field" placeholder="العنوان" />
          <select name="clientId" className="field" defaultValue="">
            <option value="">بدون موكّل</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select name="caseId" className="field" defaultValue="">
            <option value="">بدون قضية</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} — {c.name}
              </option>
            ))}
          </select>
          <textarea name="notes" rows={3} className="field" placeholder="ملاحظات" />
          {state.error && <p className="text-sm text-seal-600">{state.error}</p>}
          {state.success && <p className="text-sm text-brand-700">{state.success}</p>}
          <SubmitButton />
        </form>
      )}

      <div className={canManage ? "" : "lg:col-span-2"}>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-line bg-paper/60">
              <tr>
                <th className="table-th">الجهة</th>
                <th className="table-th">النوع</th>
                <th className="table-th">التواصل</th>
                <th className="table-th">الارتباط</th>
                {canManage && <th className="table-th">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="p-8 text-center text-sm text-gray-500">
                    لا توجد جهات مسجلة بعد
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="align-top hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium text-gray-800">{contact.name}</div>
                      <p className="text-xs text-gray-400">
                        {[contact.organization, contact.roleTitle].filter(Boolean).join(" — ") || "—"}
                      </p>
                    </td>
                    <td className="table-td">
                      <Badge className="bg-brand-50 text-brand-800">
                        {CONTACT_TYPE_LABELS[contact.type]}
                      </Badge>
                    </td>
                    <td className="table-td text-xs">
                      <div dir="ltr">{contact.phone ?? "—"}</div>
                      <div dir="ltr">{contact.email ?? ""}</div>
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      <div>{contact.clientName ?? "—"}</div>
                      {contact.caseTitle && <div>{contact.caseNumber} — {contact.caseTitle}</div>}
                    </td>
                    {canManage && (
                      <td className="table-td">
                        <DeleteContact id={contact.id} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeleteContact({ id }: { id: string }) {
  const [, action] = useActionState(deleteContactAction, EMPTY);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("حذف هذه الجهة؟")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-md p-2 text-seal-600 hover:bg-seal-50" aria-label="حذف">
        <IconTrash className="h-4 w-4" />
      </button>
    </form>
  );
}
