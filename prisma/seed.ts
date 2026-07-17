import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * إنشاء حساب المدير الأول من متغيرات البيئة.
 * يعمل مرة واحدة — إذا كان البريد موجوداً لا يفعل شيئاً.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "مدير المكتب";

  if (!email || !password) {
    throw new Error(
      "يجب ضبط ADMIN_EMAIL و ADMIN_PASSWORD في ملف البيئة قبل تشغيل seed"
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD يجب ألا يقل عن 8 أحرف");
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    console.log(`✔ حساب المدير موجود بالفعل: ${email}`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ تم إنشاء حساب المدير: ${admin.email}`);
  console.log("   يمكنك الآن تسجيل الدخول وإنشاء حسابات الموظفين.");
}

main()
  .catch((e) => {
    console.error("❌ فشل seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
