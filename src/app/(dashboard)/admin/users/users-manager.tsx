"use client";

import { Fragment, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createUserAction,
  updateUserAction,
  resetPasswordAction,
  type ActionResult,
} from "./actions";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  effectivePermissionsFor,
  type Permission,
} from "@/lib/rbac";
import { Badge } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { formatDateTime } from "@/lib/labels";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  permissionOverridesJson: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];
const EMPTY: ActionResult = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export function UsersManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createState, createAction] = useActionState(createUserAction, EMPTY);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.025]">
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="btn-primary"
        >
          {showCreate ? (
            "إغلاق النموذج"
          ) : (
            <>
              <IconPlus className="h-4 w-4" /> إضافة موظف جديد
            </>
          )}
        </button>
      </div>

      {showCreate && (
        <div className="form-panel">
          <h3 className="form-title mb-5">إنشاء حساب موظف</h3>
          {createState.error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {createState.error}
            </div>
          )}
          {createState.ok && createState.success && (
            <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {createState.success}
            </div>
          )}
          <form
            action={createAction}
            className="form-grid"
            key={createState.success /* reset form after success */}
          >
            <div>
              <label className="label">الاسم الكامل</label>
              <input name="name" required className="field" />
            </div>
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                name="email"
                type="email"
                required
                className="field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">كلمة المرور المبدئية</label>
              <input
                name="password"
                type="text"
                required
                minLength={8}
                className="field"
                placeholder="8 أحرف على الأقل، حروف وأرقام"
              />
            </div>
            <div>
              <label className="label">الدور / الصلاحية</label>
              <select name="role" required className="field" defaultValue="SECRETARY">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">الهاتف (اختياري)</label>
              <input name="phone" className="field" dir="ltr" />
            </div>
            <div className="flex items-end">
              <Submit label="إنشاء الحساب" />
            </div>
          </form>
        </div>
      )}

      {/* جدول الموظفين */}
      <div className="data-panel overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="table-th">الاسم</th>
              <th className="table-th">البريد</th>
              <th className="table-th">الدور</th>
              <th className="table-th">الحالة</th>
              <th className="table-th">آخر دخول</th>
              <th className="table-th">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="table-td font-medium">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="mr-1 text-xs text-brand-600">(أنت)</span>
                    )}
                  </td>
                  <td className="table-td" dir="ltr">
                    {u.email}
                  </td>
                  <td className="table-td">
                    <Badge className="bg-brand-50 text-brand-700">
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}
                    </Badge>
                  </td>
                  <td className="table-td">
                    {u.isActive ? (
                      <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">معطّل</Badge>
                    )}
                  </td>
                  <td className="table-td text-xs text-gray-500">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() =>
                        setEditingId(editingId === u.id ? null : u.id)
                      }
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {editingId === u.id ? "إغلاق" : "تعديل"}
                    </button>
                  </td>
                </tr>
                {editingId === u.id && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50 p-4">
                      <EditPanel user={u} isSelf={u.id === currentUserId} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditPanel({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [editState, editAction] = useActionState(updateUserAction, EMPTY);
  const [pwState, pwAction] = useActionState(resetPasswordAction, EMPTY);
  const role = user.role as keyof typeof ROLE_LABELS;
  const hasCustomPermissions = Boolean(user.permissionOverridesJson);
  const selectedPermissions = new Set(
    effectivePermissionsFor({
      role,
      permissionOverridesJson: user.permissionOverridesJson,
    })
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(360px,0.55fr)]">
      {/* تعديل البيانات */}
      <form action={editAction} className="form-panel-compact space-y-4">
        <h4 className="font-semibold">تعديل بيانات الموظف</h4>
        <input type="hidden" name="id" value={user.id} />
        {editState.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {editState.error}
          </div>
        )}
        {editState.ok && editState.success && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {editState.success}
          </div>
        )}
        <div>
          <label className="label">الاسم</label>
          <input name="name" defaultValue={user.name} required className="field" />
        </div>
        <div>
          <label className="label">الدور</label>
          <select name="role" defaultValue={user.role} className="field">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الهاتف</label>
          <input
            name="phone"
            defaultValue={user.phone ?? ""}
            className="field"
            dir="ltr"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={user.isActive}
            disabled={isSelf}
          />
          الحساب مفعّل
          {isSelf && (
            <span className="text-xs text-gray-400">(لا يمكنك تعطيل نفسك)</span>
          )}
        </label>

        <div className="rounded-lg border border-line bg-paper/70 p-4">
          <label className="mb-3 flex items-start gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              name="useCustomPermissions"
              defaultChecked={hasCustomPermissions}
              className="mt-1"
            />
            صلاحيات مخصصة لهذا الموظف
          </label>
          <p className="mb-4 text-xs leading-6 text-gray-500">
            لو غير مفعلة، الموظف سيستخدم صلاحيات الدور المختار. عند تفعيلها سيستخدم الصلاحيات المحددة هنا فقط.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <fieldset key={group.title} className="rounded-lg border border-line bg-white p-3">
                <legend className="px-1 text-xs font-bold text-brand-700">{group.title}</legend>
                <div className="mt-2 space-y-2">
                  {group.permissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input
                        type="checkbox"
                        name="permissions"
                        value={permission}
                        defaultChecked={selectedPermissions.has(permission)}
                      />
                      {PERMISSION_LABELS[permission as Permission]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
        <Submit label="حفظ التعديلات" />
      </form>

      {/* تغيير كلمة المرور */}
      <form action={pwAction} className="form-panel-compact space-y-4">
        <h4 className="font-semibold">تعيين كلمة مرور جديدة</h4>
        <input type="hidden" name="id" value={user.id} />
        {pwState.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {pwState.error}
          </div>
        )}
        {pwState.ok && pwState.success && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {pwState.success}
          </div>
        )}
        <div>
          <label className="label">كلمة المرور الجديدة</label>
          <input
            name="password"
            type="text"
            required
            minLength={8}
            className="field"
            placeholder="سيُطلب من الموظف استخدامها في الدخول"
          />
        </div>
        <p className="text-xs text-gray-500">
          سيتم إنهاء كل جلسات الموظف الحالية فور التغيير.
        </p>
        <Submit label="تغيير كلمة المرور" />
      </form>
    </div>
  );
}
