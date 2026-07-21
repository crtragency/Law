"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteContractAction,
  updateContractStatusAction,
  type ActionResult,
} from "../actions";
import {
  IconCheck,
  IconFileText,
  IconPen,
  IconSend,
  IconTrash,
} from "@/components/icons";

const EMPTY: ActionResult = { ok: false };

export function ContractActionsBar({
  id,
  canManage,
  status,
}: {
  id: string;
  canManage: boolean;
  status: string;
}) {
  const router = useRouter();
  const [statusState, updateStatus] = useActionState(updateContractStatusAction, EMPTY);
  const [, del] = useActionState(deleteContractAction, EMPTY);

  useEffect(() => {
    if (statusState.ok) router.refresh();
  }, [router, statusState.ok]);

  return (
    <div className="no-print flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => window.print()} className="btn-primary">
          <IconFileText className="h-4 w-4" /> طباعة / حفظ PDF
        </button>
        {canManage && (
          <>
            {["DRAFT", "SENT"].includes(status) && (
              <StatusButton
                action={updateStatus}
                id={id}
                status="SENT"
                label={status === "SENT" ? "إعادة إرسال للعميل" : "إرسال للعميل"}
                icon={<IconSend className="h-4 w-4" />}
              />
            )}
            {status === "SENT" && (
              <StatusButton
                action={updateStatus}
                id={id}
                status="CLIENT_SIGNED"
                label="تسجيل توقيع العميل"
                icon={<IconCheck className="h-4 w-4" />}
              />
            )}
            {status === "CLIENT_SIGNED" && (
              <StatusButton
                action={updateStatus}
                id={id}
                status="ACTIVE"
                label="اعتماد المكتب"
                icon={<IconCheck className="h-4 w-4" />}
                primary
              />
            )}
            {status === "ACTIVE" && (
              <StatusButton
                action={updateStatus}
                id={id}
                status="COMPLETED"
                label="إنهاء الاتفاقية"
                icon={<IconCheck className="h-4 w-4" />}
              />
            )}
            <Link href={`/contracts/${id}/edit`} className="btn-secondary">
              <IconPen className="h-4 w-4" /> تعديل
            </Link>
            <form
              action={del}
              onSubmit={(e) => {
                if (!confirm("حذف هذه الاتفاقية نهائياً؟")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="btn-secondary text-seal-600">
                <IconTrash className="h-4 w-4" /> حذف
              </button>
            </form>
          </>
        )}
      </div>
      {(statusState.error || statusState.success) && (
        <p
          className={`text-xs font-semibold ${
            statusState.ok ? "text-brand-700" : "text-seal-600"
          }`}
        >
          {statusState.success || statusState.error}
        </p>
      )}
    </div>
  );
}

function StatusButton({
  action,
  id,
  status,
  label,
  icon,
  primary = false,
}: {
  action: (payload: FormData) => void;
  id: string;
  status: string;
  label: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={primary ? "btn-primary" : "btn-secondary"}>
        {icon}
        {label}
      </button>
    </form>
  );
}
