import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-session";
import { IconScale, IconLogout } from "@/components/icons";
import { portalLogoutAction } from "../logout-action";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await requirePortalClient();
  const displayName =
    client.type === "COMPANY" && client.companyName
      ? client.companyName
      : client.name;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-brand-950 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] text-brass-300">
              <IconScale className="h-5 w-5" />
            </span>
            <span className="font-display font-bold">بوابة العميل</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-brand-200 sm:block">
              {displayName}
            </span>
            <form action={portalLogoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-brand-100 transition hover:bg-white/[0.06]"
              >
                <IconLogout className="h-4 w-4" /> خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
