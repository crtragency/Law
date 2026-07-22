import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/storage";

/**
 * تحميل مستند: يتحقق من تسجيل الدخول والصلاحية، ثم يعيد التوجيه إلى
 * رابط موقّع قصير العمر (دقيقتان). الملفات نفسها خاصة تماماً في التخزين.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, "documents.view")) {
    return new NextResponse("غير مصرح بالوصول", { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return new NextResponse("المستند غير موجود", { status: 404 });
  }

  // مستند قديم مسجَّل كرابط خارجي؟ وجّه إليه مباشرة.
  if (/^https?:\/\//i.test(doc.storageKey)) {
    return NextResponse.redirect(doc.storageKey);
  }

  try {
    const url = await createSignedDownloadUrl(doc.storageKey);
    return NextResponse.redirect(url);
  } catch {
    return new NextResponse("تعذّر تجهيز رابط التحميل", { status: 500 });
  }
}
