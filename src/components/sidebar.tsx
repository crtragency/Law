"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/(dashboard)/logout/actions";
import {
  Icon,
  IconScale,
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
  userName: string;
  roleLabel: string;
}

export function Sidebar({ items, userName, roleLabel }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = userName.trim().charAt(0) || "؟";

  return (
    <>
      {/* شريط علوي للموبايل */}
      <div className="flex items-center justify-between bg-brand-950 p-4 lg:hidden">
        <span className="flex items-center gap-2.5 font-display font-bold text-white">
          <IconScale className="text-brass-300" /> مكتب المحاماة
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-white/15 p-2 text-brand-100"
          aria-label="القائمة"
        >
          <IconMenu />
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 bg-brand-950 lg:block lg:w-64`}
      >
        <div className="flex h-full flex-col p-4 lg:sticky lg:top-0 lg:h-screen">
          {/* العلامة */}
          <div className="mb-2 hidden items-center gap-3 px-2 pt-3 lg:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.06] text-brass-300">
              <IconScale className="h-[22px] w-[22px]" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold text-white">
                مكتب المحاماة
              </div>
              <div className="mt-0.5 text-[11px] text-brand-300">
                إدارة القضايا والفريق
              </div>
            </div>
          </div>

          {/* السطر المزدوج — توقيع الهوية بنسخة نحاسية */}
          <div className="mx-2 mb-4 hidden lg:block" aria-hidden>
            <div className="border-t-2 border-brass-400/50" />
            <div className="mt-[3px] border-t border-brass-400/20" />
          </div>

          <nav className="flex-1 space-y-0.5">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-white/[0.07] font-semibold text-white"
                      : "font-medium text-brand-200 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {/* علامة الصفحة النشطة: شريط نحاسي كفاصل الكتب */}
                  {active && (
                    <span
                      className="absolute inset-y-2 right-0 w-[3px] rounded-full bg-brass-400"
                      aria-hidden
                    />
                  )}
                  <Icon
                    name={item.icon}
                    className={`h-[18px] w-[18px] ${
                      active ? "text-brass-300" : "text-brand-400"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brass-400/20 text-sm font-bold text-brass-200">
                {initials}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">
                  {userName}
                </div>
                <div className="mt-0.5 text-[11px] text-brand-300">
                  {roleLabel}
                </div>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-brand-100 transition hover:bg-white/[0.06] hover:text-white"
              >
                <IconLogout className="h-4 w-4" /> تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
