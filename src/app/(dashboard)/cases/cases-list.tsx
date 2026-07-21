"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseForm } from "./case-form";
import { DeleteCaseButton } from "./delete-case-button";
import { Badge } from "@/components/ui";
import { IconFileText, IconPen, IconPlus, IconSearch } from "@/components/icons";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_TYPE_LABELS,
} from "@/lib/labels";

interface CaseRow {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  caseType: string;
  clientId: string;
  court: string | null;
  assignedLawyerId: string | null;
  description: string | null;
  clientName: string;
  lawyerName: string | null;
}

interface Option {
  id: string;
  name: string;
}

export function CasesList({
  cases,
  clients,
  lawyers,
  canManage,
}: {
  cases: CaseRow[];
  clients: Option[];
  lawyers: Option[];
  canManage: boolean;
}) {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<CaseRow | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = cases.filter((c) => {
    const matchesText =
      c.title.includes(query) ||
      c.caseNumber.includes(query) ||
      c.clientName.includes(query);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesText && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setShowNew((v) => !v);
            }}
            className="btn-primary"
          >
            {showNew ? (
              "إغلاق النموذج"
            ) : (
              <>
                <IconPlus className="h-4 w-4" /> قضية جديدة
              </>
            )}
          </button>
        )}
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="field pr-9"
            placeholder="بحث برقم القضية أو العنوان أو الموكّل"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="field max-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">كل الحالات</option>
          {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {showNew && canManage && (
        <CaseForm
          clients={clients}
          lawyers={lawyers}
          onDone={() => setShowNew(false)}
          onCancel={() => setShowNew(false)}
        />
      )}

      {editing && canManage && (
        <CaseForm
          key={editing.id}
          clients={clients}
          lawyers={lawyers}
          values={{
            id: editing.id,
            caseNumber: editing.caseNumber,
            title: editing.title,
            clientId: editing.clientId,
            court: editing.court,
            caseType: editing.caseType,
            status: editing.status,
            assignedLawyerId: editing.assignedLawyerId,
            description: editing.description,
          }}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="data-panel overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="table-th">رقم القضية</th>
              <th className="table-th">العنوان</th>
              <th className="table-th">الموكّل</th>
              <th className="table-th">النوع</th>
              <th className="table-th">المحامي</th>
              <th className="table-th">الحالة</th>
              {canManage && <th className="table-th">إجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="p-6 text-center text-sm text-gray-500">
                  لا توجد قضايا مطابقة
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium" dir="ltr">
                    <Link href={`/cases/${c.id}`} className="text-brand-600 hover:underline">
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="table-td">
                    <Link href={`/cases/${c.id}`} className="hover:underline">
                      {c.title}
                    </Link>
                  </td>
                  <td className="table-td">{c.clientName}</td>
                  <td className="table-td">
                    {CASE_TYPE_LABELS[c.caseType]}
                  </td>
                  <td className="table-td">{c.lawyerName ?? "—"}</td>
                  <td className="table-td">
                    <Badge className={CASE_STATUS_COLORS[c.status]}>
                      {CASE_STATUS_LABELS[c.status]}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="table-td">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                        >
                          <IconFileText className="h-4 w-4" />
                          تفاصيل
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNew(false);
                            setEditing(c);
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-brass-700 transition hover:bg-brass-50"
                        >
                          <IconPen className="h-4 w-4" />
                          تعديل
                        </button>
                        <DeleteCaseButton
                          id={c.id}
                          caseLabel={`${c.caseNumber} - ${c.title}`}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
