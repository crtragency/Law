import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileSearch,
  FileSignature,
  Files,
  FolderLock,
  Gavel,
  HardDriveUpload,
  LayoutDashboard,
  MailCheck,
  MessageSquareText,
  Play,
  Plus,
  ReceiptText,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Workflow,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SaasHeroScene } from "@/components/saas-hero-scene";
import { getSessionUser } from "@/lib/session";
import { SaasLeadForm } from "./saas-lead-form";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";

const capabilityGroups: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  accent: "green" | "blue" | "gold" | "coral";
}> = [
  {
    title: "إدارة القضايا والتقاضي",
    description:
      "ملف كامل لكل قضية: الأطراف، المراحل، الجلسات، المذكرات، القرارات والإجراء القادم.",
    icon: Gavel,
    accent: "green",
  },
  {
    title: "الموكلون وبوابة العميل",
    description:
      "حساب مستقل للعميل يتابع منه قضاياه ومستنداته ورسائله وفواتيره حسب الصلاحية.",
    icon: Users,
    accent: "blue",
  },
  {
    title: "العقود واتفاقيات الأتعاب",
    description:
      "إنشاء الاتفاقية من نموذج مرن مع ضريبة 15% مستقلة، دفعات وتدفق اعتماد وتوقيع.",
    icon: FileSignature,
    accent: "gold",
  },
  {
    title: "المالية والتحصيل",
    description:
      "فواتير ومدفوعات ومصروفات قضائية وكشوف حساب وتقارير تحصيل مرتبطة بالموكل.",
    icon: CircleDollarSign,
    accent: "coral",
  },
  {
    title: "مركز الملفات",
    description:
      "رفع PDF وWord والصور وبقية الملفات، ربطها بالقضية وفهرستها للبحث والمشاركة.",
    icon: Files,
    accent: "blue",
  },
  {
    title: "المهام والموافقات",
    description:
      "توزيع العمل حسب الموظف والأولوية والموعد مع تعليقات واعتمادات ومسار مراجعة واضح.",
    icon: ClipboardCheck,
    accent: "green",
  },
  {
    title: "التقويم والتنبيهات",
    description:
      "الجلسات والاجتماعات والمهل النظامية والتنبيهات تظهر للفريق قبل فوات الموعد.",
    icon: CalendarClock,
    accent: "gold",
  },
  {
    title: "المراسلات والاتصالات",
    description:
      "سجل موحد للمكالمات والرسائل والوارد والصادر ومحاضر الاجتماعات وتواصل العميل.",
    icon: MessageSquareText,
    accent: "coral",
  },
  {
    title: "الحضور وطلبات الموظفين",
    description:
      "حضور وانصراف من 8 إلى 4، تأخير، إجازات، أذونات واعتماد إداري وتصدير أسبوعي.",
    icon: Clock3,
    accent: "green",
  },
  {
    title: "الصلاحيات وسجل التدقيق",
    description:
      "كل موظف يرى ما يخص دوره فقط، مع سجل واضح للإنشاء والتعديل والحذف والدخول.",
    icon: FolderLock,
    accent: "blue",
  },
  {
    title: "البحث الشامل",
    description:
      "فقاعة بحث واحدة تصل إلى القضية والعميل والمستند والفاتورة والموعد بسرعة.",
    icon: Search,
    accent: "gold",
  },
  {
    title: "التقارير ومؤشرات المكتب",
    description:
      "لوحة يومية وتقارير تشغيل ومالية تُظهر الضغط والإنجاز والمواعيد والمبالغ المستحقة.",
    icon: ChartNoAxesCombined,
    accent: "coral",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "استقبل الملف",
    description:
      "أنشئ الموكل والقضية وارفع المستندات وحدد فريق العمل والصلاحيات.",
    icon: HardDriveUpload,
  },
  {
    number: "02",
    title: "شغّل الفريق",
    description:
      "وزّع المهام والجلسات والطلبات وتابع التنفيذ من لوحة واحدة.",
    icon: Workflow,
  },
  {
    number: "03",
    title: "شارك العميل",
    description:
      "أرسل التحديثات والمستندات والاتفاقية والفاتورة إلى بوابته الخاصة.",
    icon: MailCheck,
  },
  {
    number: "04",
    title: "قِس النتيجة",
    description:
      "راجع التحصيل والإنجاز والحضور والمواعيد من تقارير جاهزة للقرار.",
    icon: ChartNoAxesCombined,
  },
];

const pricingFeatures = [
  "كل وحدات إدارة المكتب بدون تقسيم خطط",
  "حسابات الموظفين وصلاحيات الأدوار",
  "بوابة خاصة لكل موكل",
  "رفع الملفات وإدارة المستندات",
  "الحضور والانصراف وطلبات الإجازة",
  "التقارير والتصدير وسجل التدقيق",
  "تحديثات وتحسينات مستمرة",
];

const questions = [
  {
    question: "هل النسخة التجريبية مرتبطة ببيانات حقيقية؟",
    answer:
      "لا. كل الأسماء والقضايا والمبالغ داخل الجولة وهمية ومعزولة تمامًا، ويمكنك تجربة الواجهات بدون تسجيل أو تغيير أي بيانات فعلية.",
  },
  {
    question: "هل السعر يشمل كل الوحدات؟",
    answer:
      "نعم، الاشتراك الشهري 1000 ريال للمكتب ويشمل الوحدات الموضحة في الصفحة. أي احتياج خاص بالمكتب تتم مراجعته قبل التفعيل.",
  },
  {
    question: "هل يستطيع العميل متابعة قضيته؟",
    answer:
      "نعم. لكل موكل بوابة مستقلة وصلاحية محددة لمتابعة القضايا والمستندات والرسائل والعقود والفواتير التي يشاركها المكتب معه.",
  },
  {
    question: "هل يمكن تحديد صلاحيات كل موظف؟",
    answer:
      "نعم. مدير المكتب يحدد ما يستطيع كل دور رؤيته واستخدامه، مع سجل تدقيق للعمليات الحساسة.",
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <main className={styles.site} dir="rtl">
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink} aria-label="مِيزان - الرئيسية">
          <BrandLogo className={styles.logoMark} priority />
          <span>
            <strong>مِيزان</strong>
            <small>لإدارة مكاتب المحاماة</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="التنقل الرئيسي">
          <a href="#product">المنتج</a>
          <a href="#capabilities">الخدمات</a>
          <a href="#pricing">السعر</a>
          <a href="#contact">ابدأ الآن</a>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/demo" className={styles.headerDemo}>
            <Play aria-hidden size={15} fill="currentColor" />
            جرّب الديمو
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className={styles.headerLogin}
          >
            {user ? "لوحة المكتب" : "تسجيل الدخول"}
            <ArrowLeft aria-hidden size={16} />
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <SaasHeroScene />
        <div className={styles.heroVeil} aria-hidden />
        <div className={styles.heroContent}>
          <div className={styles.heroKicker}>
            <Sparkles aria-hidden size={15} />
            مكتبك القانوني، بنظام واحد
          </div>
          <h1>منصة إدارة مكاتب المحاماة</h1>
          <p>
            من أول تواصل مع الموكل حتى إقفال القضية وتحصيل الأتعاب. مِيزان
            يجمع الفريق والملفات والمواعيد والمالية في مساحة تشغيل واحدة.
          </p>
          <div className={styles.heroActions}>
            <Link href="/demo" className={styles.primaryCta}>
              <Play aria-hidden size={18} fill="currentColor" />
              افتح النسخة التجريبية
            </Link>
            <a href="#pricing" className={styles.secondaryCta}>
              شاهد الاشتراك
              <ArrowLeft aria-hidden size={18} />
            </a>
          </div>
          <div className={styles.heroProof}>
            <span>
              <Check size={15} />
              بدون بطاقة دفع
            </span>
            <span>
              <Check size={15} />
              بيانات ديمو وهمية
            </span>
            <span>
              <Check size={15} />
              تجربة مباشرة
            </span>
          </div>
        </div>

        <div className={styles.heroProduct}>
          <div className={styles.productChrome}>
            <span />
            <span />
            <span />
            <small>demo.mizan.sa</small>
            <BadgeCheck aria-hidden size={17} />
          </div>
          <Image
            src="/showcase/demo-dashboard.png"
            alt="لوحة تشغيل منصة مِيزان لإدارة مكتب المحاماة"
            width={1600}
            height={1000}
            priority
            className={styles.heroImage}
            sizes="(max-width: 760px) 94vw, 1180px"
          />
        </div>
      </section>

      <section className={styles.outcomeBand} aria-label="مزايا المنصة">
        <div>
          <span>من أول يوم</span>
          <strong>تشغيل واضح</strong>
        </div>
        <div>
          <span>للفريق والعميل</span>
          <strong>مصدر واحد للحقيقة</strong>
        </div>
        <div>
          <span>كل شهر</span>
          <strong>1000 ريال فقط</strong>
        </div>
        <div>
          <span>على أي جهاز</span>
          <strong>واجهة عربية متجاوبة</strong>
        </div>
      </section>

      <section id="product" className={styles.productSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>داخل المنتج</span>
          <h2>شايف المكتب كله، من غير ما تدور</h2>
          <p>
            الواجهة مصممة للعمل اليومي السريع: ما يحتاج انتباهك يظهر أولًا،
            والتفاصيل تظل قريبة عندما تحتاجها.
          </p>
        </div>

        <div className={styles.showcaseRows}>
          <article className={styles.showcaseRow}>
            <div className={styles.showcaseCopy}>
              <span className={styles.showcaseNumber}>01</span>
              <div className={styles.showcaseIcon}>
                <LayoutDashboard aria-hidden size={22} />
              </div>
              <h3>لوحة يومية تقود الشغل</h3>
              <p>
                القضايا النشطة، مهام اليوم، الجلسات، التحصيل وآخر حركة داخل
                المكتب في شاشة واحدة مرتبة حسب الأولوية.
              </p>
              <ul>
                <li>
                  <Check size={15} /> مؤشرات تشغيل فورية
                </li>
                <li>
                  <Check size={15} /> مواعيد وإجراءات قريبة
                </li>
                <li>
                  <Check size={15} /> نشاط الفريق في سياقه
                </li>
              </ul>
            </div>
            <div className={styles.showcaseMedia}>
              <Image
                src="/showcase/demo-dashboard.png"
                alt="لوحة التحكم اليومية داخل منصة مِيزان"
                width={1600}
                height={1000}
                loading="eager"
                sizes="(max-width: 900px) 94vw, 58vw"
              />
            </div>
          </article>

          <article className={`${styles.showcaseRow} ${styles.showcaseReverse}`}>
            <div className={styles.showcaseCopy}>
              <span className={styles.showcaseNumber}>02</span>
              <div className={`${styles.showcaseIcon} ${styles.iconBlue}`}>
                <Scale aria-hidden size={22} />
              </div>
              <h3>القضية لا تفقد أي تفصيلة</h3>
              <p>
                من رقم القضية والموكل إلى الفريق والمراحل والجلسات والمستندات
                والملاحظات. كل شيء مترابط وقابل للرجوع.
              </p>
              <ul>
                <li>
                  <Check size={15} /> حالات ومراحل قانونية واضحة
                </li>
                <li>
                  <Check size={15} /> ربط المستندات والمهام والمواعيد
                </li>
                <li>
                  <Check size={15} /> تحديث العميل حسب الصلاحية
                </li>
              </ul>
            </div>
            <div className={`${styles.showcaseMedia} ${styles.mediaBlue}`}>
              <Image
                src="/showcase/demo-cases.png"
                alt="إدارة القضايا داخل منصة مِيزان"
                width={1600}
                height={1000}
                loading="eager"
                sizes="(max-width: 900px) 94vw, 58vw"
              />
            </div>
          </article>

          <article className={styles.showcaseRow}>
            <div className={styles.showcaseCopy}>
              <span className={styles.showcaseNumber}>03</span>
              <div className={`${styles.showcaseIcon} ${styles.iconCoral}`}>
                <ReceiptText aria-hidden size={22} />
              </div>
              <h3>الأتعاب والتحصيل بدون جداول مشتتة</h3>
              <p>
                الاتفاقية والفاتورة والدفعات والضريبة والمصروفات تظهر في سجل
                مالي واضح لكل موكل ولكل قضية.
              </p>
              <ul>
                <li>
                  <Check size={15} /> ضريبة 15% مستقلة وواضحة
                </li>
                <li>
                  <Check size={15} /> جدولة الدفعات والاستحقاقات
                </li>
                <li>
                  <Check size={15} /> كشف حساب قابل للتصدير
                </li>
              </ul>
            </div>
            <div className={`${styles.showcaseMedia} ${styles.mediaCoral}`}>
              <Image
                src="/showcase/demo-finance.png"
                alt="إدارة الفواتير والتحصيل داخل منصة مِيزان"
                width={1600}
                height={1000}
                loading="eager"
                sizes="(max-width: 900px) 94vw, 58vw"
              />
            </div>
          </article>
        </div>

        <div className={styles.productDemoCta}>
          <div>
            <span>الجولة مفتوحة الآن</span>
            <strong>لا تكتفِ بالصور. استخدم النظام بنفسك.</strong>
          </div>
          <Link href="/demo">
            دخول النسخة التجريبية
            <ArrowLeft aria-hidden size={18} />
          </Link>
        </div>
      </section>

      <section id="capabilities" className={styles.capabilitiesSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionEyebrow}>كل ما يحتاجه المكتب</span>
          <h2>منصة واحدة بدل عشر أدوات متفرقة</h2>
          <p>
            كل وحدة مبنية لتتكامل مع بقية العمل، فلا تعيد إدخال نفس البيانات
            ولا تضيع المعلومة بين البريد والجداول والمحادثات.
          </p>
        </div>

        <div className={styles.capabilityGrid}>
          {capabilityGroups.map((capability) => {
            const Icon = capability.icon;
            return (
              <article
                key={capability.title}
                className={styles.capabilityCard}
                data-accent={capability.accent}
              >
                <div>
                  <Icon aria-hidden size={21} strokeWidth={1.9} />
                </div>
                <span>{capability.title}</span>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <ArrowLeft
                  className={styles.capabilityArrow}
                  aria-hidden
                  size={17}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.workflowSection}>
        <div className={styles.workflowIntro}>
          <span>مسار عمل واحد</span>
          <h2>المعلومة تتحرك مع الملف، لا خلفه</h2>
          <p>
            كل خطوة تضيف قيمة للخطوة التالية، من استقبال الموكل حتى التقرير
            النهائي.
          </p>
        </div>
        <div className={styles.workflowSteps}>
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <Icon aria-hidden size={23} />
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={styles.trustVisual}>
          <div className={styles.permissionBoard}>
            <div className={styles.permissionTop}>
              <span>
                <ShieldCheck size={18} />
                صلاحيات الفريق
              </span>
              <strong>محدثة الآن</strong>
            </div>
            <PermissionRow
              avatar="ن"
              name="نورة العتيبي"
              role="مديرة المكتب"
              access="كامل"
            />
            <PermissionRow
              avatar="س"
              name="سارة القحطاني"
              role="محامية"
              access="القضايا والمهام"
            />
            <PermissionRow
              avatar="ر"
              name="ريم المطيري"
              role="المالية"
              access="الفواتير والتحصيل"
            />
            <div className={styles.auditLine}>
              <FileSearch size={18} />
              <span>
                <strong>سجل التدقيق يعمل</strong>
                <small>آخر عملية: اعتماد اتفاقية أتعاب</small>
              </span>
              <BadgeCheck size={18} />
            </div>
          </div>
        </div>
        <div className={styles.trustCopy}>
          <span className={styles.sectionEyebrow}>تحكم بدون تعقيد</span>
          <h2>كل شخص يرى ما يحتاجه فقط</h2>
          <p>
            مدير المكتب يحدد صلاحيات الأدوار، ويراجع العمليات الحساسة،
            والحضور، وطلبات الموظفين، وآخر التغييرات من مكان واضح.
          </p>
          <div className={styles.trustList}>
            <FeatureLine
              icon={UserCheck}
              title="صلاحيات حسب الدور"
              body="مدير، محامٍ، مساعد قانوني، مالية وموظف استقبال."
            />
            <FeatureLine
              icon={FileSearch}
              title="سجل تدقيق"
              body="توثيق العمليات المهمة مع المستخدم والتوقيت."
            />
            <FeatureLine
              icon={BellRing}
              title="تنبيهات في السياق"
              body="الموعد أو الرسالة أو الطلب يصل للشخص المعني."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.pricingIntro}>
          <span className={styles.sectionEyebrow}>سعر واضح</span>
          <h2>كل المكتب. اشتراك واحد.</h2>
          <p>
            لا تختار بين القضايا والمالية والموظفين. شغّل المنظومة كاملة من
            البداية.
          </p>
        </div>
        <div className={styles.pricingLayout}>
          <article className={styles.priceCard}>
            <div className={styles.priceTop}>
              <span>اشتراك المكتب</span>
              <BadgeCheck size={20} />
            </div>
            <div className={styles.price}>
              <strong>1000</strong>
              <span>
                ريال سعودي
                <small>شهريًا</small>
              </span>
            </div>
            <p>
              حساب واحد للمكتب يشغّل كل الوحدات ويجمع الفريق والعملاء والملفات.
            </p>
            <a href="#contact" className={styles.priceAction}>
              اطلب تفعيل مكتبك
              <ArrowLeft aria-hidden size={18} />
            </a>
            <Link href="/demo" className={styles.priceDemo}>
              <Play aria-hidden size={15} fill="currentColor" />
              جرّب قبل الاشتراك
            </Link>
          </article>
          <div className={styles.pricingFeatures}>
            <span>يشمل الاشتراك</span>
            <div>
              {pricingFeatures.map((feature) => (
                <p key={feature}>
                  <Check aria-hidden size={17} />
                  {feature}
                </p>
              ))}
            </div>
            <div className={styles.priceNote}>
              <Building2 aria-hidden size={22} />
              <span>
                <strong>نجهّز مساحة المكتب معك</strong>
                <small>
                  ضبط بيانات الشركة والأدوار ونماذج العمل الأساسية قبل
                  التشغيل.
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.faqIntro}>
          <span className={styles.sectionEyebrow}>أسئلة مهمة</span>
          <h2>قبل ما تبدأ</h2>
          <p>إجابات مباشرة عن التجربة والتشغيل والاشتراك.</p>
        </div>
        <div className={styles.faqList}>
          {questions.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>
                {item.question}
                <Plus aria-hidden size={18} />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactCopy}>
          <span>جاهز ترتّب مكتبك؟</span>
          <h2>خلّينا نجهز لك مساحة عمل حقيقية، باسم مكتبك.</h2>
          <p>
            اكتب بيانات التواصل، وسنراجع حجم الفريق وطريقة العمل ونرتب خطوة
            التفعيل.
          </p>
          <div>
            <p>
              <Check size={16} /> مراجعة احتياج المكتب
            </p>
            <p>
              <Check size={16} /> تجهيز الأدوار والصلاحيات
            </p>
            <p>
              <Check size={16} /> بدء التشغيل بدون بطاقة دفع
            </p>
          </div>
        </div>
        <SaasLeadForm />
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <BrandLogo className={styles.footerLogo} />
          <span>
            <strong>مِيزان</strong>
            <small>منصة إدارة مكاتب المحاماة</small>
          </span>
        </div>
        <p>تشغيل قانوني أوضح للفريق والموكل.</p>
        <div>
          <Link href="/demo">النسخة التجريبية</Link>
          <Link href="/login">دخول المكتب</Link>
          <Link href="/portal/login">بوابة العميل</Link>
        </div>
      </footer>
    </main>
  );
}

function PermissionRow({
  avatar,
  name,
  role,
  access,
}: {
  avatar: string;
  name: string;
  role: string;
  access: string;
}) {
  return (
    <div className={styles.permissionRow}>
      <span className={styles.permissionAvatar}>{avatar}</span>
      <span>
        <strong>{name}</strong>
        <small>{role}</small>
      </span>
      <span>{access}</span>
      <Check size={16} />
    </div>
  );
}

function FeatureLine({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.featureLine}>
      <span>
        <Icon aria-hidden size={19} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}
