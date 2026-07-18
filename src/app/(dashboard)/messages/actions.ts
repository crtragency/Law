"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request";
import { notify } from "@/lib/notifications";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const messageSchema = z.object({
  recipientId: z.string().min(1, "اختر الموظف"),
  body: z.string().trim().min(1, "اكتب الرسالة").max(4000),
});

export async function sendMessageAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };

  let actor;
  try {
    // كل من يستطيع الدخول يمكنه المراسلة (لا صلاحية خاصة مطلوبة).
    actor = await ensurePermission("tasks.view");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = messageSchema.safeParse({
    recipientId: formData.get("recipientId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  if (parsed.data.recipientId === actor.id) {
    return { ok: false, error: "لا يمكنك مراسلة نفسك" };
  }

  // تأكد أن المستلِم موظف فعّال.
  const recipient = await prisma.user.findFirst({
    where: { id: parsed.data.recipientId, isActive: true },
    select: { id: true },
  });
  if (!recipient) {
    return { ok: false, error: "الموظف غير موجود أو معطّل" };
  }

  await prisma.message.create({
    data: {
      senderId: actor.id,
      recipientId: parsed.data.recipientId,
      body: parsed.data.body,
    },
  });

  await notify({
    userId: parsed.data.recipientId,
    type: "message",
    title: "رسالة جديدة",
    body: `${actor.name} أرسل لك رسالة`,
    link: `/messages?to=${actor.id}`,
  });

  revalidatePath("/messages");
  return { ok: true };
}
