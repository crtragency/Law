import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  // لا توجد جلسة: لو مفيش أي حساب في النظام، وجّه لصفحة الإعداد الأول.
  let target = "/login";
  try {
    const hasUsers = (await prisma.user.count()) > 0;
    if (!hasUsers) target = "/setup";
  } catch {
    // قاعدة البيانات غير جاهزة — دع صفحة الإعداد تشرح الخطوات.
    target = "/setup";
  }

  redirect(target);
}
