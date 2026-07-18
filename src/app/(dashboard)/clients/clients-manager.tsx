"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveClientAction,
  deleteClientAction,
  type ActionResult,
} from "./actions";
import { EmptyState } from "@/components/ui";
import {
  IconPlus,
  IconSearch,
  IconPhone,
  IconMail,
  IconPin,
  IconUsers,
} from "@/components/icons";

interface ClientRow {
  id: string;
  name: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  caseCount: number;
}

const EMPTY: ActionResult = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export function ClientsManager({
  clients,
  canManage,
}: {
  clients: ClientRow[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = clients.filter(
    (c) =>
      c.name.includes(query) ||
      (c.phone ?? "").includes(query) ||
      (c.nationalId ?? "").includes(query)
  );

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(c: ClientRow) {
    setEditing(c);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button onClick={openNew} className="btn-primary">
            <IconPlus className="h-4 w-4" /> موكّل جديد
          </button>
        )}
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="field pr-9"
            placeholder="بحث بالاسم أو الهاتف أو الرقم القومي"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {showForm && canManage && (
        <ClientForm
          client={editing}
          onClose={() => setShowForm(false)}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<IconUsers />} title="لا يوجد موكّلون مطابقون" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-ink">{c.name}</h3>
                <span className="badge shrink-0 bg-brand-50 text-brand-800">
                  {c.caseCount} قضية
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {c.phone && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <IconPhone className="h-4 w-4 shrink-0 text-gray-400" />
                    <span dir="ltr">{c.phone}</span>
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <IconMail className="h-4 w-4 shrink-0 text-gray-400" />
                    <span dir="ltr">{c.email}</span>
                  </p>
                )}
                {c.address && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <IconPin className="h-4 w-4 shrink-0 text-gray-400" />
                    {c.address}
                  </p>
                )}
                {c.nationalId && (
                  <p className="text-xs text-gray-400">
                    رقم قومي: {c.nationalId}
                  </p>
                )}
              </div>
              {canManage && (
                <div className="mt-3 flex gap-3 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    تعديل
                  </button>
                  <DeleteButton id={c.id} disabled={c.caseCount > 0} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientForm({
  client,
  onClose,
}: {
  client: ClientRow | null;
  onClose: () => void;
}) {
  const [state, action] = useActionState(saveClientAction, EMPTY);

  // أغلق النموذج تلقائياً بعد النجاح.
  useEffect(() => {
    if (state.ok && state.success) {
      const t = setTimeout(onClose, 700);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-bold">
        {client ? "تعديل بيانات الموكّل" : "إضافة موكّل جديد"}
      </h3>
      {state.error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && state.success && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </div>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        {client && <input type="hidden" name="id" value={client.id} />}
        <div>
          <label className="label">الاسم *</label>
          <input name="name" defaultValue={client?.name} required className="field" />
        </div>
        <div>
          <label className="label">الرقم القومي</label>
          <input
            name="nationalId"
            defaultValue={client?.nationalId ?? ""}
            className="field"
            dir="ltr"
          />
        </div>
        <div>
          <label className="label">الهاتف</label>
          <input
            name="phone"
            defaultValue={client?.phone ?? ""}
            className="field"
            dir="ltr"
          />
        </div>
        <div>
          <label className="label">البريد</label>
          <input
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className="field"
            dir="ltr"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">العنوان</label>
          <input
            name="address"
            defaultValue={client?.address ?? ""}
            className="field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">ملاحظات</label>
          <textarea
            name="notes"
            defaultValue={client?.notes ?? ""}
            rows={2}
            className="field"
          />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <Submit label={client ? "حفظ" : "إضافة"} />
          <button type="button" onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteButton({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, action] = useActionState(deleteClientAction, EMPTY);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("هل أنت متأكد من حذف هذا الموكّل؟")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "لا يمكن حذف موكّل له قضايا" : "حذف"}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-40"
      >
        حذف
      </button>
      {state.error && (
        <span className="mr-2 text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
