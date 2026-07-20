import "server-only";

import { prisma } from "@/lib/prisma";

export function nullIfEmpty(value: string | null | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export function dateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateOrNow(value: string | null | undefined): Date {
  return dateOrNull(value) ?? new Date();
}

export async function caseBelongsToClient(
  caseId: string | null | undefined,
  clientId: string | null | undefined
): Promise<boolean> {
  if (!caseId || !clientId) return true;
  const c = await prisma.case.findFirst({
    where: { id: caseId, clientId },
    select: { id: true },
  });
  return !!c;
}
