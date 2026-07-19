import "server-only";
import { prisma } from "@/lib/prisma";

export const FIRM_ID = "firm";

export type FirmSettings = {
  id: string;
  name: string;
  legalForm: string | null;
  licenseNumber: string | null;
  address: string | null;
  branches: string | null;
  phones: string | null;
  email: string | null;
  taxNumber: string | null;
  managerName: string | null;
  city: string | null;
};

/** جلب بيانات الشركة، مع إنشاء سجل افتراضي إن لم يوجد. */
export async function getFirmSettings(): Promise<FirmSettings> {
  const existing = await prisma.firmSettings.findUnique({
    where: { id: FIRM_ID },
  });
  if (existing) return existing;
  return {
    id: FIRM_ID,
    name: "مكتب المحاماة",
    legalForm: null,
    licenseNumber: null,
    address: null,
    branches: null,
    phones: null,
    email: null,
    taxNumber: null,
    managerName: null,
    city: null,
  };
}
