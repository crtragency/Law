import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/session";
import { getFirmSettings } from "@/lib/firm";
import { PublicConsultationForm } from "./public-consultation-form";
import { BrandLogo, BRAND_LOGO_SRC } from "@/components/brand-logo";
import {
  IconCalendar,
  IconCheck,
  IconFileText,
  IconFolder,
  IconMessage,
  IconScale,
  IconShield,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const services = [
  { title: "التقاضي وإدارة القضايا", body: "متابعة الجلسات والإجراءات والمستندات حتى الإقفال.", icon: IconScale },
  { title: "العقود واتفاقيات الأتعاب", body: "صياغة ومراجعة واعتماد الاتفاقيات وربطها بالمدفوعات.", icon: IconFileText },
  { title: "الاستشارات القانونية", body: "استقبال السؤال، دراسة الملف، وتوثيق الرأي القانوني.", icon: IconMessage },
  { title: "بوابة العميل", body: "دخول خاص للعميل لمتابعة القضية والمرفقات والفواتير.", icon: IconShield },
];

const stats = [
  { label: "قنوات متابعة", value: "بوابة + بريد" },
  { label: "ملفات منظمة", value: "قضايا وعقود" },
  { label: "إشعارات", value: "مواعيد وتحديثات" },
];

export default async function HomePage() {
  const [user, firm] = await Promise.all([getSessionUser(), getFirmSettings()]);
  const firmName = firm.name || "مكتب المحاماة";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0 opacity-10">
          <Image
            src={BRAND_LOGO_SRC}
            alt=""
            fill
            priority
            className="object-contain object-left"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper to-transparent" aria-hidden />

        <header className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo className="h-12 w-12 rounded-2xl bg-white/95 p-1.5" priority />
            <span>
              <span className="block font-display text-lg font-bold">{firmName}</span>
              <span className="block text-xs text-white/60">{firm.legalForm ?? "خدمات قانونية متكاملة"}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/portal/login" className="btn-secondary border-white/[0.15] bg-white/10 text-white hover:bg-white/[0.15]">
              بوابة العميل
            </Link>
            <Link href={user ? "/dashboard" : "/login"} className="btn-primary bg-brass-500 text-brand-950 hover:bg-brass-400">
              {user ? "لوحة التحكم" : "دخول المكتب"}
            </Link>
          </div>
        </header>

        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-8 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/10 px-3 py-1 text-sm text-white/75">
              <IconCheck className="h-4 w-4 text-brass-300" />
              تشغيل قانوني منظم من أول تواصل حتى إقفال الملف
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {firmName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-white/75">
              استقبل طلبك القانوني، نراجعه داخل النظام، ثم نربطه بالاستشارة أو القضية أو العقد المناسب مع متابعة واضحة للعميل.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                  <p className="font-display text-xl font-bold text-brass-200">{item.value}</p>
                  <p className="mt-1 text-xs text-white/60">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-5">
              <p className="text-sm font-semibold text-brass-200">طلب استشارة</p>
              <h2 className="mt-1 font-display text-2xl font-bold">اكتب موضوعك القانوني</h2>
              <p className="mt-2 text-sm leading-7 text-white/65">
                الطلب يدخل مباشرة لقسم الاستشارات داخل لوحة المكتب.
              </p>
            </div>
            <PublicConsultationForm />
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="page-title">الخدمات القانونية</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
              نفس الخدمات مرتبطة داخلياً بالقضايا والموكلين والمواعيد والفواتير، فلا تضيع التفاصيل بين الأدوات.
            </p>
          </div>
          <div className="rule-double w-52" aria-hidden />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="card min-h-[210px]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon />
                </div>
                <h3 className="font-display text-lg font-bold text-ink">{service.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{service.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 sm:px-8 lg:grid-cols-3">
          <Info icon={<IconFolder />} label="متابعة القضايا" value="ملف واحد يجمع الإجراءات والمستندات والمراسلات." />
          <Info icon={<IconCalendar />} label="مواعيد وتنبيهات" value="الجلسات والاستحقاقات تظهر للموظف والعميل حسب الصلاحية." />
          <Info icon={<IconShield />} label="خصوصية العميل" value="بوابة مستقلة لكل موكل ببيانات دخول خاصة." />
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-gray-500 sm:px-8">
        <p>{firmName}</p>
        <p dir="ltr">{firm.email ?? firm.phones ?? firm.address ?? "law office"}</p>
      </footer>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div>
        <h3 className="font-display font-bold text-ink">{label}</h3>
        <p className="mt-1 text-sm leading-7 text-gray-600">{value}</p>
      </div>
    </div>
  );
}
