import { redirect } from "next/navigation";
import { SAAS_MARKETING_ENABLED } from "@/lib/features";
import { getSessionUser } from "@/lib/session";
import SaasLandingPage from "./saas-landing-page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (SAAS_MARKETING_ENABLED) {
    return <SaasLandingPage />;
  }

  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
