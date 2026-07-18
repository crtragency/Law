"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { verifySameOrigin } from "@/lib/request";

export async function markAllReadAction(): Promise<void> {
  if (!(await verifySameOrigin())) return;
  const user = await getSessionUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
