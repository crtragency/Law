import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewer = await getSessionUser();
  if (!viewer) {
    return new NextResponse("غير مصرح بالوصول", { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { avatarStorageKey: true },
  });
  if (!user?.avatarStorageKey) {
    return new NextResponse("الصورة غير موجودة", { status: 404 });
  }

  try {
    const url = await createSignedDownloadUrl(user.avatarStorageKey, 300);
    return NextResponse.redirect(url);
  } catch {
    return new NextResponse("تعذر تجهيز الصورة", { status: 500 });
  }
}
