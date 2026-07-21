"use server";

import { revalidatePath } from "next/cache";
import { AuthError, ensurePermission } from "@/lib/auth";
import { processEmailQueue } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/request";

async function guard() {
  if (!(await verifySameOrigin())) return false;
  try {
    await ensurePermission("audit.view");
    return true;
  } catch (e) {
    if (e instanceof AuthError) return false;
    throw e;
  }
}

export async function processEmailQueueFormAction(): Promise<void> {
  if (!(await guard())) return;
  await processEmailQueue({ limit: 25 });
  revalidatePath("/admin/email-queue");
}

export async function retryEmailDeliveryFormAction(formData: FormData): Promise<void> {
  if (!(await guard())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.emailDelivery.update({
    where: { id },
    data: { status: "QUEUED", nextAttemptAt: new Date(), lastError: null },
  });
  await processEmailQueue({ id, limit: 1 });
  revalidatePath("/admin/email-queue");
}

export async function cancelEmailDeliveryFormAction(formData: FormData): Promise<void> {
  if (!(await guard())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.emailDelivery.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/email-queue");
}
