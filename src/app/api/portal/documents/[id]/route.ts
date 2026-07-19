import { NextResponse } from "next/server";
import { getPortalClient } from "@/lib/portal-session";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/storage";

/**
 * تحميل مستند من بوابة العميل: يتحقق أن العميل مسجَّل الدخول وأن المستند
 * يخصّ إحدى قضاياه فقط، ثم يعيد التوجيه لرابط موقّع قصير العمر.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getPortalClient();
  if (!client) {
    return new NextResponse("غير مصرح بالوصول", { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, case: { clientId: client.id } },
  });
  if (!doc) {
    return new NextResponse("المستند غير موجود", { status: 404 });
  }

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
