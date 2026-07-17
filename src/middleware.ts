import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// اسم كوكي الجلسة — معرّف هنا مباشرة لأن الـ middleware يعمل على بيئة الحافة
// (edge) ولا يجب أن يستورد كوداً يعتمد على Node (Prisma / crypto).
// يجب أن يطابق SESSION_COOKIE في src/lib/session.ts
const SESSION_COOKIE = "law_session";

// المسارات العامة التي لا تتطلب تسجيل دخول.
const PUBLIC_PATHS = ["/login"];

/**
 * حماية أوّلية للمسارات على مستوى الحافة (edge).
 * ملاحظة: هذا فحص خفيف لوجود الكوكي فقط لتحسين تجربة المستخدم؛
 * التحقق الفعلي من صلاحية الجلسة يتم داخل Server Components عبر requireUser().
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // مستخدم مسجّل يحاول فتح صفحة الدخول → وجّهه للوحة التحكم.
  if (isPublic && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // مسار محمي بدون كوكي → وجّهه لتسجيل الدخول.
  if (!isPublic && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // طبّق على كل المسارات ما عدا الملفات الثابتة و API الداخلية لـ Next.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
