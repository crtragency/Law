"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  saveClientAction,
  deleteClientAction,
  setClientPortalAction,
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
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  nationalId: string | null;
  nationality: string | null;
  companyName: string | null;
  unifiedNumber: string | null;
  taxNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  caseCount: number;
  portalEnabled: boolean;
  portalEmail: string | null;
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
  canViewFinance,
}: {
  clients: ClientRow[];
  canManage: boolean;
  canViewFinance: boolean;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.025]">
        {canManage && (
          <button onClick={openNew} className="btn-primary">
            <IconPlus className="h-4 w-4" /> موكّل جديد
          </button>
        )}
        <div className="relative w-full max-w-md">
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
                <div>
                  <h3 className="font-display font-bold text-ink">
                    {c.type === "COMPANY" && c.companyName ? c.companyName : c.name}
                  </h3>
                  <span
                    className={`badge mt-1 ${
                      c.type === "COMPANY"
                        ? "bg-brass-50 text-brass-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.type === "COMPANY" ? "منشأة تجارية" : "فرد"}
                  </span>
                </div>
                <span className="badge shrink-0 bg-brand-50 text-brand-800">
                  {c.caseCount} قضية
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {c.type === "COMPANY" && c.name && (
                  <p className="text-sm text-gray-600">الممثّل: {c.name}</p>
                )}
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
                {c.type === "INDIVIDUAL" && c.nationalId && (
                  <p className="text-xs text-gray-400">
                    هوية وطنية: {c.nationalId}
                  </p>
                )}
                {c.type === "COMPANY" && c.unifiedNumber && (
                  <p className="text-xs text-gray-400">
                    الرقم الموحّد: {c.unifiedNumber}
                  </p>
                )}
              </div>
              {(canManage || canViewFinance) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3">
                  {canViewFinance && (
                    <Link
                      href={`/clients/${c.id}/statement`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      كشف الحساب
                    </Link>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => openEdit(c)}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        تعديل
                      </button>
                      <DeleteButton id={c.id} disabled={c.caseCount > 0} />
                    </>
                  )}
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
  const [type, setType] = useState<"INDIVIDUAL" | "COMPANY">(
    client?.type ?? "INDIVIDUAL"
  );

  // أغلق النموذج تلقائياً بعد النجاح.
  useEffect(() => {
    if (state.ok && state.success) {
      const t = setTimeout(onClose, 700);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <div className="form-panel">
      <h3 className="form-title mb-5">
        {client ? "تعديل بيانات الموكّل" : "إضافة موكّل جديد"}
      </h3>
      {state.error && (
        <div className="mb-3 rounded-md border border-seal-100 bg-seal-50 px-3 py-2 text-sm text-seal-700">
          {state.error}
        </div>
      )}
      {state.ok && state.success && (
        <div className="mb-3 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {state.success}
        </div>
      )}

      {/* نوع الموكّل */}
      <div className="mb-5 flex rounded-xl border border-line bg-paper p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setType("INDIVIDUAL")}
          className={`flex-1 rounded px-3 py-1.5 transition ${
            type === "INDIVIDUAL" ? "bg-brand-700 text-white" : "text-gray-600"
          }`}
        >
          فرد
        </button>
        <button
          type="button"
          onClick={() => setType("COMPANY")}
          className={`flex-1 rounded px-3 py-1.5 transition ${
            type === "COMPANY" ? "bg-brand-700 text-white" : "text-gray-600"
          }`}
        >
          منشأة تجارية
        </button>
      </div>

      <form action={action} className="form-grid">
        {client && <input type="hidden" name="id" value={client.id} />}
        <input type="hidden" name="type" value={type} />

        {type === "COMPANY" && (
          <>
            <div className="sm:col-span-2">
              <label className="label">اسم الشركة / المنشأة *</label>
              <input
                name="companyName"
                defaultValue={client?.companyName ?? ""}
                required
                className="field"
              />
            </div>
            <div>
              <label className="label">الرقم الوطني الموحّد</label>
              <input
                name="unifiedNumber"
                defaultValue={client?.unifiedNumber ?? ""}
                className="field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">الرقم الضريبي</label>
              <input
                name="taxNumber"
                defaultValue={client?.taxNumber ?? ""}
                className="field"
                dir="ltr"
              />
            </div>
          </>
        )}

        <div>
          <label className="label">
            {type === "COMPANY" ? "اسم الممثّل / المفوّض *" : "الاسم *"}
          </label>
          <input name="name" defaultValue={client?.name} required className="field" />
        </div>

        {type === "INDIVIDUAL" && (
          <>
            <div>
              <label className="label">رقم الهوية الوطنية</label>
              <input
                name="nationalId"
                defaultValue={client?.nationalId ?? ""}
                className="field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">الجنسية</label>
              <input
                name="nationality"
                defaultValue={client?.nationality ?? ""}
                className="field"
              />
            </div>
          </>
        )}

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

      {client && <PortalSection client={client} />}
    </div>
  );
}

/** إدارة دخول العميل إلى البوابة (تظهر عند تعديل موكّل قائم). */
function PortalSection({ client }: { client: ClientRow }) {
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(client.portalEnabled);
  const [email, setEmail] = useState(client.portalEmail ?? client.email ?? "");
  const [password, setPassword] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save(nextEnabled: boolean) {
    setMsg(null);
    start(async () => {
      const res = await setClientPortalAction({
        clientId: client.id,
        enabled: nextEnabled,
        portalEmail: email,
        password: password || undefined,
        sendWelcome,
      });
      if (res.ok) {
        setEnabled(nextEnabled);
        setPassword("");
        setMsg({ ok: true, text: res.success ?? "تم" });
      } else {
        setMsg({ ok: false, text: res.error ?? "تعذّر الحفظ" });
      }
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-paper/70 p-5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-display font-bold text-ink">بوابة العميل</h4>
        <span
          className={`badge ${
            enabled ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {enabled ? "مُفعّلة" : "غير مُفعّلة"}
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        يدخل العميل ببريد وكلمة مرور ليتابع قضاياه ومستنداته ومواعيده.
      </p>

      {msg && (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            msg.ok
              ? "border border-brand-100 bg-brand-50 text-brand-800"
              : "border border-seal-100 bg-seal-50 text-seal-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">بريد الدخول</label>
          <input
            className="field"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
          />
        </div>
        <div>
          <label className="label">
            {client.portalEnabled ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
          </label>
          <input
            className="field"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 أحرف على الأقل، حروف وأرقام"
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sendWelcome}
          onChange={(e) => setSendWelcome(e.target.checked)}
        />
        إرسال بريد ترحيبي للعميل عند التفعيل
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => save(true)}
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "..." : enabled ? "حفظ البيانات" : "تفعيل البوابة"}
        </button>
        {enabled && (
          <button
            type="button"
            onClick={() => save(false)}
            disabled={pending}
            className="btn-secondary text-seal-600"
          >
            تعطيل
          </button>
        )}
      </div>
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
