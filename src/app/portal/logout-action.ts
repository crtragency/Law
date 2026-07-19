"use server";

import { redirect } from "next/navigation";
import { destroyPortalSession } from "@/lib/portal-session";

export async function portalLogoutAction() {
  await destroyPortalSession();
  redirect("/portal/login");
}
