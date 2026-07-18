"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/(dashboard)/logout/actions";
import { Icon, IconScale, IconLogout, IconMenu, type IconName } from "@/components/icons";

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
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 lg:hidden">
        <span className="flex items-center gap-2 font-bold text-brand-800">
          <IconScale className="text-brand-600" /> مكتب المحاماة
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-gray-300 p-2 text-gray-600"
          aria-label="القائمة"
        >
          <IconMenu />
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-l border-gray-200 bg-white lg:block lg:w-64`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 hidden items-center gap-2.5 px-2 pt-2 lg:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <IconScale />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-gray-900">مكتب المحاماة</div>
              <div className="text-[11px] text-gray-400">نظام إدارة القضايا</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    className={active ? "text-brand-600" : "text-gray-400"}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {initials}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-800">
                  {userName}
                </div>
                <div className="text-xs text-gray-500">{roleLabel}</div>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="btn-secondary w-full justify-center gap-2"
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
