"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/(dashboard)/logout/actions";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  items: NavItem[];
  userName: string;
  roleLabel: string;
}

export function Sidebar({ items, userName, roleLabel }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* شريط علوي للموبايل */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 lg:hidden">
        <span className="font-bold text-brand-800">⚖️ مكتب المحاماة</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-gray-300 p-2"
          aria-label="القائمة"
        >
          ☰
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-l border-gray-200 bg-white lg:block lg:w-64`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 hidden items-center gap-2 px-2 lg:flex">
            <span className="text-2xl">⚖️</span>
            <span className="text-lg font-bold text-brand-800">
              مكتب المحاماة
            </span>
          </div>

          <nav className="flex-1 space-y-1">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="mb-3 px-2">
              <div className="text-sm font-semibold text-gray-800">
                {userName}
              </div>
              <div className="text-xs text-gray-500">{roleLabel}</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary w-full">
                🚪 تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
