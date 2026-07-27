"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IconFileText,
  IconFolder,
  IconPaperclip,
  IconPlus,
  IconUsers,
} from "@/components/icons";

type QuickAction = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function HeaderTools({
  canCreateCases,
  canCreateClients,
  canCreateTasks,
  canCreateDocuments,
}: {
  canCreateCases: boolean;
  canCreateClients: boolean;
  canCreateTasks: boolean;
  canCreateDocuments: boolean;
}) {
  return (
    <QuickCreate
      actions={[
        canCreateCases && {
          href: "/cases?create=1",
          label: "قضية جديدة",
          icon: <IconFolder />,
        },
        canCreateClients && {
          href: "/clients?create=1",
          label: "موكل جديد",
          icon: <IconUsers />,
        },
        canCreateTasks && {
          href: "/tasks?create=1",
          label: "مهمة جديدة",
          icon: <IconFileText />,
        },
        canCreateDocuments && {
          href: "/documents?create=1",
          label: "رفع مستند",
          icon: <IconPaperclip />,
        },
      ].filter(Boolean) as QuickAction[]}
    />
  );
}

function QuickCreate({ actions }: { actions: QuickAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="header-icon-button bg-brand-700 text-white hover:bg-brand-800 hover:text-white"
        aria-label="إنشاء جديد"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconPlus className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="header-dropdown left-0 top-11 w-52" role="menu">
          <div className="border-b border-line px-3 py-2.5 text-xs font-bold text-gray-500">
            إنشاء سريع
          </div>
          <div className="p-1.5">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-800"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-50 text-brand-700">
                  {action.icon}
                </span>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
