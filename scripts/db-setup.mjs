// يُنفَّذ أثناء البناء على Vercel: يزامن مخطط قاعدة البيانات (ينشئ الجداول).
// يتخطّى بأمان إذا لم يكن DATABASE_URL مضبوطاً حتى لا يفشل البناء.
import { execSync } from "node:child_process";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log(
    "⚠️  DATABASE_URL غير مضبوط — تخطّي مزامنة قاعدة البيانات (سيُبنى المشروع فقط)."
  );
  process.exit(0);
}

// بعض مزوّدي القواعد (مثل Supabase) يستخدمون Pooler لا يدعم أوامر تعديل المخطط.
// لو ضبطت DIRECT_URL (اتصال مباشر)، نستخدمه لعملية db push، وإلا نستخدم DATABASE_URL.
const pushUrl = process.env.DIRECT_URL || dbUrl;

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
