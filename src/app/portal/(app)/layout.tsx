import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-session";
import { IconFolder, IconLogout, IconScale } from "@/components/icons";
import { portalLogoutAction } from "../logout-action";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await requirePortalClient();
  const displayName =
    client.type === "COMPANY" && client.companyName ? client.companyName : client.name;

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-950/96 text-white shadow-lg shadow-brand-950/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-10">
          <Link href="/portal" className="group flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brass-300/25 bg-white/[0.07] text-brass-200 transition group-hover:border-brass-300/45">
              <IconScale className="h-6 w-6" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-bold">
                بوابة العميل
              </span>
              <span className="mt-0.5 block truncate text-xs text-brand-200">
                متابعة القضايا والمستندات والمواعيد
              </span>
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/portal"
              className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-brand-100 transition hover:bg-white/[0.09] sm:flex"
            >
              <IconFolder className="h-4 w-4" /> قضاياي
            </Link>
            <span className="hidden max-w-[220px] truncate text-sm text-brand-100 md:block">
              {displayName}
            </span>
            <form action={portalLogoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-brand-100 transition hover:bg-seal-600/20 hover:text-white"
              >
                <IconLogout className="h-4 w-4" /> خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-7 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
