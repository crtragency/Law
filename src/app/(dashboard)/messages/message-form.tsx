"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { sendMessageAction, type ActionResult } from "./actions";
import { IconMessage } from "@/components/icons";

const EMPTY: ActionResult = { ok: false };

function SendBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary shrink-0"
      disabled={pending}
      aria-label="إرسال"
    >
      <IconMessage className="h-4 w-4" /> إرسال
    </button>
  );
}

export function MessageForm({ recipientId }: { recipientId: string }) {
  const [state, action] = useActionState(sendMessageAction, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  // نفرّغ الحقل بعد الإرسال الناجح.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex items-center gap-2 border-t border-gray-200 bg-white p-3"
    >
      <input type="hidden" name="recipientId" value={recipientId} />
      <input
        name="body"
        required
        autoComplete="off"
        className="field"
        placeholder="اكتب رسالة..."
      />
      <SendBtn />
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
