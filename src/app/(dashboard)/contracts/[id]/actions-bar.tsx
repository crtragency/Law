"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteContractAction, type ActionResult } from "../actions";
import { IconFileText, IconPen, IconTrash } from "@/components/icons";

const EMPTY: ActionResult = { ok: false };

export function ContractActionsBar({
  id,
  canManage,
}: {
  id: string;
  canManage: boolean;
}) {
  const [, del] = useActionState(deleteContractAction, EMPTY);
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button onClick={() => window.print()} className="btn-primary">
        <IconFileText className="h-4 w-4" /> طباعة / حفظ PDF
      </button>
      {canManage && (
        <>
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
  );
}
