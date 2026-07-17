// يُنفَّذ أثناء البناء على Vercel: يزامن مخطط قاعدة البيانات (ينشئ الجداول).
// يتخطّى بأمان إذا لم يكن DATABASE_URL مضبوطاً حتى لا يفشل البناء.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log(
    "⚠️  DATABASE_URL غير مضبوط — تخطّي مزامنة قاعدة البيانات (سيُبنى المشروع فقط)."
  );
  process.exit(0);
}

try {
  console.log("🗄️  مزامنة مخطط قاعدة البيانات (prisma db push)...");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  console.log("✅ تمت مزامنة قاعدة البيانات.");
} catch (err) {
  console.error("❌ فشلت مزامنة قاعدة البيانات:", err?.message ?? err);
  process.exit(1);
}
