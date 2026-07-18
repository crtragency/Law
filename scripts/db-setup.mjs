// يُنفَّذ أثناء البناء على Vercel:
//   1) يزامن مخطط قاعدة البيانات (ينشئ الجداول).
//   2) ينشئ حساب المدير تلقائياً من متغيرات البيئة (بدون أي صفحة عامة).
// يتخطّى بأمان إذا لم يكن DATABASE_URL مضبوطاً حتى لا يفشل البناء.
import { execSync } from "node:child_process";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log(
    "⚠️  DATABASE_URL غير مضبوط — تخطّي تهيئة قاعدة البيانات (سيُبنى المشروع فقط)."
  );
  process.exit(0);
}

// بعض المزوّدين (مثل Supabase) يستخدمون Pooler؛ لو ضبطت DIRECT_URL نستخدمه هنا.
const pushUrl = process.env.DIRECT_URL || dbUrl;

// (1) مزامنة الجداول
try {
  console.log("🗄️  مزامنة مخطط قاعدة البيانات (prisma db push)...");
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: pushUrl },
  });
  console.log("✅ تمت مزامنة قاعدة البيانات.");
} catch (err) {
  console.error("❌ فشلت مزامنة قاعدة البيانات:", err?.message ?? err);
  process.exit(1);
}

// (2) إنشاء حساب المدير تلقائياً (إن وُجدت بياناته في البيئة)
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.log(
    "ℹ️  ADMIN_EMAIL/ADMIN_PASSWORD غير مضبوطين — لن يُنشأ حساب المدير تلقائياً."
  );
  process.exit(0);
}

try {
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient({ datasourceUrl: pushUrl });

  const lower = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });

  if (existing) {
    console.log(`✔ حساب المدير موجود بالفعل: ${lower}`);
  } else {
    if (password.length < 8) {
      throw new Error("ADMIN_PASSWORD يجب ألا يقل عن 8 أحرف");
    }
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || "مدير المكتب",
        email: lower,
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ تم إنشاء حساب المدير: ${lower}`);
  }

  await prisma.$disconnect();
} catch (err) {
  console.error("❌ فشل إنشاء حساب المدير:", err?.message ?? err);
  process.exit(1);
}
