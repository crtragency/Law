import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// أسماء الكوكيز — معرّفة هنا لأن الـ middleware يعمل على بيئة الحافة (edge)
// ولا يجب أن يستورد كوداً يعتمد على Node. يجب أن تطابق ما في lib/session و
// lib/portal-session.
const SESSION_COOKIE = "law_session"; // دخول الموظفين
const PORTAL_COOKIE = "law_portal"; // دخول العملاء

/**
 * حماية أوّلية للمسارات على مستوى الحافة. المنطقتان منفصلتان تماماً:
 *  - /portal/*  → منطقة العملاء (كوكي law_portal)
 *  - الباقي     → منطقة الموظفين (كوكي law_session)
 * التحقق الفعلي من صلاحية الجلسة يتم داخل الصفحات.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // منطقة بوابة العملاء
  if (pathname.startsWith("/portal")) {
    const hasPortal = request.cookies.has(PORTAL_COOKIE);
    const isPortalLogin = pathname === "/portal/login";
    if (isPortalLogin && hasPortal) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    if (!isPortalLogin && !hasPortal) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    return NextResponse.next();
  }

  // منطقة الموظفين
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLogin = pathname === "/login";
  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isLogin && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
