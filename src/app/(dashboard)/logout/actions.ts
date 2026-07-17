"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/session";
import { getSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) {
    await audit({
      action: "user.logout",
      userId: user.id,
      ip: await getClientIp(),
    });
  }
  await destroySession();
  redirect("/login");
}
