"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { IconTrash } from "@/components/icons";
import { deleteCaseAction, type ActionResult } from "./actions";

const EMPTY: ActionResult = { ok: false };

export function DeleteCaseButton({
  id,
  caseLabel,
  redirectTo,
  variant = "compact",
}: {
  id: string;
  caseLabel: string;
  redirectTo?: "/cases";
  variant?: "compact" | "button";
}) {
  const router = useRouter();
  const [state, action] = useActionState(deleteCaseAction, EMPTY);

  useEffect(() => {
    if (state.ok && !redirectTo) router.refresh();
  }, [redirectTo, router, state.ok]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`حذف القضية "${caseLabel}" نهائياً؟`)) {
          event.preventDefault();
        }
      }}
      className="inline-flex flex-col items-start gap-1"
    >
      <input type="hidden" name="id" value={id} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <DeleteSubmit variant={variant} />
      {state.error && <span className="text-xs text-seal-600">{state.error}</span>}
    </form>
  );
}

function DeleteSubmit({ variant }: { variant: "compact" | "button" }) {
  const { pending } = useFormStatus();

  if (variant === "button") {
    return (
      <button type="submit" disabled={pending} className="btn-danger">
        <IconTrash className="h-4 w-4" />
        {pending ? "جار الحذف..." : "حذف القضية"}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-seal-600 transition hover:bg-seal-50 disabled:opacity-50"
      aria-label="حذف القضية"
      title="حذف القضية"
    >
      <IconTrash className="h-4 w-4" />
      {pending ? "جار الحذف..." : "حذف"}
    </button>
  );
}
