"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/(dashboard)/logout/actions";
import { BrandLogo } from "@/components/brand-logo";
import {
  Icon,
  IconChevronLeft,
  IconLogout,
  IconMenu,
  type IconName,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface SidebarProps {
  items: NavItem[];
  userId: string;
  userName: string;
  avatarStorageKey?: string | null;
  roleLabel: string;
}

const NAV_GROUPS = [
  {
    label: "التشغيل",
    match: [
      "/dashboard",
      "/daily-agenda",
      "/services",
      "/cases",
      "/document-requests",
      "/documents",
      "/communications",
      "/correspondence",
      "/meetings",
      "/settlements",
      "/litigation",
      "/hearings",
      "/tasks",
      "/calendar",
      "/deadlines",
    ],
  },
  {
    label: "العلاقات والملفات",
    match: [
      "/clients",
      "/contacts",
      "/powers",
      "/contracts",
      "/templates",
      "/library",
      "/consultations",
      "/conflict-check",
    ],
  },
  {
    label: "المال والمتابعة",
    match: ["/finance", "/reminders", "/reports", "/approvals"],
  },
  {
    label: "الإدارة",
    match: [
      "/messages",
      "/notifications",
      "/profile",
      "/admin/users",
      "/admin/firm",
      "/admin/audit",
      "/admin/email-queue",
      "/admin/production",
    ],
  },
];

function groupItems(items: NavItem[]) {
  const used = new Set<string>();
  const groups = NAV_GROUPS.map((group) => {
    const groupItems = items.filter((item) => group.match.includes(item.href));
    groupItems.forEach((item) => used.add(item.href));
    return { label: group.label, items: groupItems };
  }).filter((group) => group.items.length > 0);

  const remaining = items.filter((item) => !used.has(item.href));
  return remaining.length > 0 ? [...groups, { label: "أخرى", items: remaining }] : groups;
}

export function Sidebar({
  items,
  userId,
  userName,
  avatarStorageKey,
  roleLabel,
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = userName.trim().charAt(0) || "؟";
  const groupedItems = groupItems(items);

  const avatar = avatarStorageKey ? (
    <img src={`/api/users/${userId}/avatar`} alt={userName} className="h-full w-full object-cover" />
  ) : (
    initials
  );

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#0d271f_0%,#0b211a_52%,#071812_100%)] text-white shadow-2xl shadow-brand-950/25 lg:w-[288px] lg:shadow-none">
      <div className="shrink-0 px-4 pb-3 pt-4 lg:px-5 lg:pt-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="sidebar-brand-link group flex min-w-0 items-center gap-3 rounded-lg p-1 transition hover:bg-white/[0.045]"
          >
            <span className="sidebar-brand-mark relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brass-300/25 bg-white p-0.5 shadow-inner shadow-white/5 transition duration-300 group-hover:scale-[1.02] group-hover:border-brass-300/45">
              <BrandLogo className="h-full w-full" imageClassName="scale-[1.02]" priority />
            </span>
            <span className="sidebar-reveal min-w-0 leading-tight">
              <span className="block truncate font-display text-[15px] font-bold text-white">
                مكتب المحاماة
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-brand-200">
                منصة تشغيل قانونية
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-100 transition hover:bg-white/[0.09] lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3 lg:px-4" aria-label="القائمة الرئيسية">
        <div className="space-y-4 pb-2">
          {groupedItems.map((group) => (
            <div key={group.label}>
              <div className="sidebar-group-label mb-1.5 px-3 text-[10px] font-bold uppercase tracking-normal text-brand-300/80">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`sidebar-nav-link group relative flex min-h-[40px] items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-[13px] transition duration-200 ease-out motion-safe:hover:-translate-x-0.5 ${
                        active
                          ? "bg-white/[0.12] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.16)]"
                          : "font-medium text-brand-100/80 hover:bg-white/[0.075] hover:text-white"
                      }`}
                    >
                      {active && (
                        <span
                          className="sidebar-active-marker absolute inset-y-2 right-0 w-[3px] rounded-full bg-brass-300 shadow-[0_0_16px_rgba(205,175,99,0.65)]"
                          aria-hidden
                        />
                      )}
                      <span
                        className={`sidebar-nav-icon grid h-8 w-8 shrink-0 place-items-center rounded-md transition duration-200 ${
                          active
                            ? "bg-brass-300/15 text-brass-200"
                            : "bg-white/[0.045] text-brand-300 group-hover:bg-white/[0.08] group-hover:text-brass-200"
                        }`}
                      >
                        <Icon name={item.icon} className="h-[17px] w-[17px]" />
                      </span>
                      <span className="sidebar-reveal min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer shrink-0 border-t border-white/10 bg-brand-950/25 p-4 lg:p-5">
        <div className="sidebar-footer-card rounded-lg border border-white/10 bg-white/[0.055] p-3 shadow-inner shadow-white/5">
          <Link href="/profile" className="sidebar-footer-link mb-3 flex items-center gap-3 rounded-lg p-1 transition hover:bg-white/[0.06]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brass-300 text-sm font-bold text-brand-950 shadow-lg shadow-black/10">
              {avatar}
            </span>
            <div className="sidebar-reveal min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-white">{userName}</div>
              <div className="mt-0.5 truncate text-[11px] text-brand-200">{roleLabel}</div>
            </div>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="sidebar-logout-button flex h-10 w-full items-center justify-start gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold text-brand-100 transition duration-200 hover:border-seal-100/25 hover:bg-seal-600/20 hover:text-white active:scale-[0.99]"
            >
              <span className="sidebar-logout-icon grid h-8 w-8 shrink-0 place-items-center rounded-md text-brass-200">
                <IconLogout className="h-[19px] w-[19px]" />
              </span>
              <span className="sidebar-reveal">تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-brand-950/95 p-3 text-white shadow-lg shadow-brand-950/10 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2.5 font-display font-bold text-white">
          <BrandLogo className="h-8 w-8 rounded-lg bg-white p-1" priority /> مكتب المحاماة
        </span>
        <button
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-white/15 bg-white/[0.05] p-2 text-brand-100 transition hover:bg-white/[0.1]"
          aria-label="القائمة"
          aria-expanded={open}
          type="button"
        >
          <IconMenu />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-brand-950/45 backdrop-blur-[2px] transition-opacity duration-150 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`sidebar-collapsible fixed inset-y-0 right-0 z-50 w-[min(86vw,310px)] shrink-0 transform transition-[width,transform] duration-150 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[76px] lg:translate-x-0 lg:hover:w-[288px] lg:focus-within:w-[288px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
