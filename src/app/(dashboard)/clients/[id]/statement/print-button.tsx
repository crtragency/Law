"use client";

export function StatementPrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary">
      طباعة كشف الحساب
    </button>
  );
}
