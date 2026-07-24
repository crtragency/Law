"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileStack,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./demo.module.css";

export type DemoView =
  | "dashboard"
  | "cases"
  | "clients"
  | "tasks"
  | "calendar"
  | "finance"
  | "contracts"
  | "documents";

type IconType = typeof LayoutDashboard;

const navigation: Array<{
  id: DemoView;
  label: string;
  icon: IconType;
}> = [
  { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { id: "cases", label: "القضايا", icon: FolderKanban },
  { id: "clients", label: "الموكلون", icon: Users },
  { id: "tasks", label: "المهام", icon: FileCheck2 },
  { id: "calendar", label: "التقويم والجلسات", icon: CalendarDays },
  { id: "contracts", label: "اتفاقيات الأتعاب", icon: FileStack },
  { id: "finance", label: "المالية", icon: CircleDollarSign },
  { id: "documents", label: "مركز الملفات", icon: BriefcaseBusiness },
];

const cases = [
  {
    number: "1446/تج/2841",
    title: "مطالبة بقيمة عقد توريد",
    client: "شركة رِمال للمقاولات",
    lawyer: "سارة القحطاني",
    next: "جلسة مرافعة - 28 يوليو",
    status: "قيد النظر",
    tone: "blue",
  },
  {
    number: "1446/ع/0914",
    title: "منازعة عقد عمل",
    client: "فهد الشمري",
    lawyer: "خالد الحربي",
    next: "إيداع مذكرة - 30 يوليو",
    status: "إجراء مطلوب",
    tone: "amber",
  },
  {
    number: "1445/أح/7712",
    title: "قسمة تركة",
    client: "ورثة عبدالله السالم",
    lawyer: "نورة العتيبي",
    next: "بانتظار تقرير الخبير",
    status: "مؤجلة",
    tone: "gray",
  },
  {
    number: "1446/تن/1183",
    title: "تنفيذ سند لأمر",
    client: "شركة أفق اللوجستية",
    lawyer: "محمد الدوسري",
    next: "متابعة محكمة التنفيذ",
    status: "نشطة",
    tone: "green",
  },
];

const tasks = [
  {
    title: "مراجعة مذكرة الرد النهائية",
    case: "1446/تج/2841",
    owner: "سارة القحطاني",
    due: "اليوم، 11:30 ص",
    priority: "عاجلة",
    done: false,
  },
  {
    title: "رفع محضر الاجتماع للعميل",
    case: "1446/ع/0914",
    owner: "خالد الحربي",
    due: "اليوم، 2:00 م",
    priority: "متوسطة",
    done: false,
  },
  {
    title: "مطابقة دفعة اتفاقية الأتعاب",
    case: "1446/تن/1183",
    owner: "ريم المطيري",
    due: "غدًا، 9:00 ص",
    priority: "متوسطة",
    done: false,
  },
  {
    title: "أرشفة مستندات الجلسة",
    case: "1445/أح/7712",
    owner: "نورة العتيبي",
    due: "تمت اليوم",
    priority: "مكتملة",
    done: true,
  },
];

const clients = [
  {
    name: "شركة رِمال للمقاولات",
    type: "شركة",
    cases: 3,
    balance: "24,500 ر.س",
    contact: "أحمد العتيبي",
    portal: "مفعّلة",
  },
  {
    name: "فهد محمد الشمري",
    type: "فرد",
    cases: 1,
    balance: "0 ر.س",
    contact: "05x xxx 3481",
    portal: "مفعّلة",
  },
  {
    name: "شركة أفق اللوجستية",
    type: "شركة",
    cases: 2,
    balance: "12,000 ر.س",
    contact: "ليان الحربي",
    portal: "بانتظار الدعوة",
  },
  {
    name: "ورثة عبدالله السالم",
    type: "مجموعة",
    cases: 1,
    balance: "7,500 ر.س",
    contact: "تركي السالم",
    portal: "مفعّلة",
  },
];

const financeRows = [
  {
    invoice: "INV-2026-047",
    client: "شركة رِمال للمقاولات",
    amount: "17,250 ر.س",
    due: "31 يوليو",
    status: "جزئيًا",
  },
  {
    invoice: "INV-2026-046",
    client: "شركة أفق اللوجستية",
    amount: "13,800 ر.س",
    due: "4 أغسطس",
    status: "مستحقة",
  },
  {
    invoice: "INV-2026-043",
    client: "فهد محمد الشمري",
    amount: "5,750 ر.س",
    due: "تم السداد",
    status: "مدفوعة",
  },
];

const calendarEvents = [
  {
    time: "09:00",
    day: "السبت 25 يوليو",
    title: "اجتماع تحضير المرافعة",
    meta: "قضية شركة رِمال - غرفة الاجتماعات",
    tone: "green",
  },
  {
    time: "11:30",
    day: "الأحد 26 يوليو",
    title: "جلسة عن بعد",
    meta: "منازعة عقد عمل - ناجز",
    tone: "blue",
  },
  {
    time: "13:00",
    day: "الاثنين 27 يوليو",
    title: "موعد توقيع اتفاقية أتعاب",
    meta: "عميل جديد - المكتب الرئيسي",
    tone: "gold",
  },
  {
    time: "10:15",
    day: "الثلاثاء 28 يوليو",
    title: "جلسة مرافعة",
    meta: "المحكمة التجارية - الدائرة الخامسة",
    tone: "coral",
  },
];

const contracts = [
  {
    number: "AGR-0261",
    client: "شركة رِمال للمقاولات",
    service: "تمثيل قضائي",
    total: "46,000 ر.س",
    installments: "4 دفعات",
    status: "سارية",
  },
  {
    number: "AGR-0260",
    client: "شركة أفق اللوجستية",
    service: "تنفيذ سندات",
    total: "23,000 ر.س",
    installments: "دفعتان",
    status: "بانتظار التوقيع",
  },
  {
    number: "AGR-0258",
    client: "فهد محمد الشمري",
    service: "نزاع عمالي",
    total: "11,500 ر.س",
    installments: "دفعة واحدة",
    status: "مكتملة",
  },
];

const documents = [
  {
    name: "مذكرة الرد - النسخة النهائية.pdf",
    case: "1446/تج/2841",
    owner: "سارة القحطاني",
    size: "2.4 MB",
    status: "مفهرس",
  },
  {
    name: "عقد التوريد والملاحق.pdf",
    case: "1446/تج/2841",
    owner: "نورة العتيبي",
    size: "8.1 MB",
    status: "مفهرس",
  },
  {
    name: "محضر اجتماع العميل.docx",
    case: "1446/ع/0914",
    owner: "خالد الحربي",
    size: "680 KB",
    status: "داخلي",
  },
  {
    name: "كشف الدفعات.xlsx",
    case: "1446/تن/1183",
    owner: "ريم المطيري",
    size: "340 KB",
    status: "مشارك مع العميل",
  },
];

const viewMeta: Record<
  DemoView,
  { title: string; subtitle: string; action: string }
> = {
  dashboard: {
    title: "صباح الخير، نورة",
    subtitle: "هذه صورة مباشرة ليوم العمل داخل مكتب الأفق للمحاماة.",
    action: "إجراء جديد",
  },
  cases: {
    title: "القضايا",
    subtitle: "كل ملف ومراحله ومحاميه وموعده القادم في مكان واحد.",
    action: "قضية جديدة",
  },
  clients: {
    title: "الموكلون",
    subtitle: "ملف موحّد للعميل وقضاياه وحسابه وبوابة المتابعة.",
    action: "موكل جديد",
  },
  tasks: {
    title: "المهام",
    subtitle: "توزيع واضح، أولويات، مواعيد ومتابعة الإنجاز.",
    action: "مهمة جديدة",
  },
  calendar: {
    title: "التقويم والجلسات",
    subtitle: "أسبوع المكتب كاملًا أمام الفريق بدون مواعيد ضائعة.",
    action: "إضافة موعد",
  },
  finance: {
    title: "المالية",
    subtitle: "فواتير ودفعات وضريبة وقيمة مستحقة لكل عميل.",
    action: "فاتورة جديدة",
  },
  contracts: {
    title: "اتفاقيات الأتعاب",
    subtitle: "إنشاء الاتفاقية، الضريبة، الدفعات والتوقيع في مسار واحد.",
    action: "اتفاقية جديدة",
  },
  documents: {
    title: "مركز الملفات",
    subtitle: "مستندات المكتب مرتبطة بالقضايا وقابلة للبحث والمشاركة.",
    action: "رفع ملف",
  },
};

export function DemoExperience({
  initialView,
}: {
  initialView: DemoView;
}) {
  const [activeView, setActiveView] = useState<DemoView>(initialView);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const meta = viewMeta[activeView];

  const currentNavigation = useMemo(
    () => navigation.find((item) => item.id === activeView),
    [activeView]
  );

  const switchView = (view: DemoView) => {
    setActiveView(view);
    setMobileNavOpen(false);
    window.history.replaceState(null, "", `/demo?view=${view}`);
  };

  const showReadOnly = (message = "الإجراء متاح بالكامل بعد تفعيل حساب المكتب.") => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  return (
    <main className={styles.demoRoot} dir="rtl">
      <div className={styles.demoNotice}>
        <span>
          <Sparkles aria-hidden size={15} />
          نسخة تجريبية ببيانات وهمية
        </span>
        <Link href="/">
          العودة للصفحة الرئيسية
          <ArrowLeft aria-hidden size={15} />
        </Link>
      </div>

      <div className={styles.appShell}>
        <aside
          className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}
        >
          <div className={styles.brand}>
            <BrandLogo className={styles.brandMark} priority />
            <span>
              <strong>مِيزان</strong>
              <small>مكتب الأفق للمحاماة</small>
            </span>
            <button
              type="button"
              className={styles.mobileClose}
              aria-label="إغلاق القائمة"
              onClick={() => setMobileNavOpen(false)}
            >
              <X size={19} />
            </button>
          </div>

          <p className={styles.navLabel}>مساحة العمل</p>
          <nav className={styles.navigation} aria-label="أقسام النسخة التجريبية">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeView;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={active ? styles.navActive : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={() => switchView(item.id)}
                >
                  <Icon aria-hidden size={19} strokeWidth={1.9} />
                  <span>{item.label}</span>
                  {active && <ChevronLeft aria-hidden size={15} />}
                </button>
              );
            })}
          </nav>

          <div className={styles.sidebarFoot}>
            <div className={styles.avatar}>ن</div>
            <span>
              <strong>نورة العتيبي</strong>
              <small>مديرة المكتب</small>
            </span>
            <ShieldCheck aria-hidden size={18} />
          </div>
        </aside>

        {mobileNavOpen && (
          <button
            type="button"
            className={styles.mobileOverlay}
            aria-label="إغلاق القائمة"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <section className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.topbarStart}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="فتح القائمة"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu size={19} />
              </button>
              <span className={styles.breadcrumb}>
                مِيزان / {currentNavigation?.label}
              </span>
            </div>
            <div className={styles.topbarActions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="البحث"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={18} />
              </button>
              <div className={styles.popoverAnchor}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="الإشعارات"
                  onClick={() => setNotificationsOpen((open) => !open)}
                >
                  <Bell size={18} />
                  <span className={styles.alertDot} />
                </button>
                {notificationsOpen && (
                  <div className={styles.notifications}>
                    <div className={styles.popoverTitle}>
                      <strong>آخر التنبيهات</strong>
                      <span>3 جديدة</span>
                    </div>
                    <Notice
                      icon={Gavel}
                      title="جلسة غدًا الساعة 11:30"
                      body="منازعة عقد العمل - رابط الجلسة جاهز"
                    />
                    <Notice
                      icon={FileCheck2}
                      title="تم توقيع اتفاقية الأتعاب"
                      body="شركة أفق اللوجستية"
                    />
                    <Notice
                      icon={MessageSquareText}
                      title="رسالة جديدة من العميل"
                      body="تم رفع المستندات المطلوبة"
                    />
                  </div>
                )}
              </div>
              <div className={styles.topAvatar}>ن</div>
            </div>
          </header>

          <div className={styles.content}>
            <div className={styles.pageHead}>
              <div>
                <span className={styles.eyebrow}>النسخة التجريبية</span>
                <h1>{meta.title}</h1>
                <p>{meta.subtitle}</p>
              </div>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => showReadOnly()}
              >
                <Plus aria-hidden size={18} />
                {meta.action}
              </button>
            </div>

            <DemoViewContent view={activeView} onAction={showReadOnly} />
          </div>
        </section>
      </div>

      {searchOpen && (
        <div className={styles.searchOverlay} role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.searchBackdrop}
            aria-label="إغلاق البحث"
            onClick={() => setSearchOpen(false)}
          />
          <div className={styles.searchPanel}>
            <div className={styles.searchInput}>
              <Search aria-hidden size={20} />
              <input
                autoFocus
                placeholder="ابحث عن قضية، موكل، مستند أو فاتورة..."
              />
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p>اقتراحات سريعة</p>
            {[
              "شركة رِمال للمقاولات",
              "1446/تج/2841",
              "مذكرة الرد - النسخة النهائية",
            ].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setSearchOpen(false);
                  showReadOnly(`تم العثور على: ${item}`);
                }}
              >
                <Search size={16} />
                {item}
                <ArrowLeft size={15} />
              </button>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className={styles.toast} role="status">
          <Check aria-hidden size={18} />
          {toast}
        </div>
      )}
    </main>
  );
}

function DemoViewContent({
  view,
  onAction,
}: {
  view: DemoView;
  onAction: (message?: string) => void;
}) {
  if (view === "dashboard") return <DashboardView onAction={onAction} />;
  if (view === "cases")
    return (
      <DataView
        stats={[
          ["القضايا النشطة", "18", "+3 هذا الشهر"],
          ["جلسات هذا الأسبوع", "7", "2 غدًا"],
          ["إجراءات قريبة", "11", "خلال 7 أيام"],
          ["نسبة الإنجاز", "76%", "+8% عن يونيو"],
        ]}
      >
        <CaseTable onAction={onAction} />
      </DataView>
    );
  if (view === "clients")
    return (
      <DataView
        stats={[
          ["إجمالي الموكلين", "64", "+5 هذا الشهر"],
          ["بوابات مفعّلة", "49", "76% من العملاء"],
          ["قضايا مفتوحة", "18", "لـ 14 موكلًا"],
          ["أرصدة مستحقة", "44,000", "ريال سعودي"],
        ]}
      >
        <ClientTable onAction={onAction} />
      </DataView>
    );
  if (view === "tasks")
    return <TasksView onAction={onAction} />;
  if (view === "calendar")
    return <CalendarView onAction={onAction} />;
  if (view === "finance")
    return (
      <DataView
        stats={[
          ["محصّل هذا الشهر", "86,250", "ريال سعودي"],
          ["قيد التحصيل", "44,000", "6 فواتير"],
          ["الضريبة", "16,875", "محسوبة تلقائيًا"],
          ["مصروفات القضايا", "12,400", "ريال سعودي"],
        ]}
      >
        <FinanceTable onAction={onAction} />
      </DataView>
    );
  if (view === "contracts")
    return (
      <DataView
        stats={[
          ["اتفاقيات سارية", "21", "بقيمة 684 ألف"],
          ["بانتظار التوقيع", "3", "دعوات مرسلة"],
          ["دفعات هذا الشهر", "14", "من 9 عملاء"],
          ["ضريبة مستحقة", "16,875", "15% مستقلة"],
        ]}
      >
        <ContractTable onAction={onAction} />
      </DataView>
    );
  return (
    <DataView
      stats={[
        ["إجمالي الملفات", "1,248", "+86 هذا الشهر"],
        ["ملفات مفهرسة", "1,194", "96% قابلة للبحث"],
        ["مشاركة مع العملاء", "74", "عبر البوابة"],
        ["طلبات مستندات", "6", "3 مستعجلة"],
      ]}
    >
      <DocumentTable onAction={onAction} />
    </DataView>
  );
}

function DataView({
  stats,
  children,
}: {
  stats: string[][];
  children: React.ReactNode;
}) {
  return (
    <div className={styles.viewStack}>
      <div className={styles.statGrid}>
        {stats.map(([label, value, note], index) => (
          <article key={label} className={styles.statCard}>
            <span className={styles.statIndex}>0{index + 1}</span>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      {children}
    </div>
  );
}

function DashboardView({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <div className={styles.dashboardGrid}>
      <section className={styles.focusPanel}>
        <div className={styles.panelTitleLight}>
          <div>
            <span>تركيز اليوم</span>
            <h2>4 مهام قبل نهاية الدوام</h2>
          </div>
          <Clock3 size={21} />
        </div>
        <div className={styles.focusProgress}>
          <span style={{ width: "68%" }} />
        </div>
        <div className={styles.focusNumber}>
          <strong>68%</strong>
          <span>اكتمل من خطة اليوم</span>
        </div>
        <button type="button" onClick={() => onAction("تم فتح مهام اليوم")}>
          افتح مساحة العمل
          <ArrowLeft size={17} />
        </button>
      </section>

      <section className={styles.metricPanel}>
        <div className={styles.panelHeading}>
          <div>
            <span>ملفات نشطة</span>
            <h2>18 قضية</h2>
          </div>
          <FolderKanban size={21} />
        </div>
        <div className={styles.barChart} aria-label="تطور القضايا">
          {[42, 62, 48, 75, 58, 88, 71].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className={styles.chartFoot}>
          <span>يناير</span>
          <span>يوليو</span>
        </div>
      </section>

      <section className={styles.metricPanel}>
        <div className={styles.panelHeading}>
          <div>
            <span>تحصيل الشهر</span>
            <h2>86,250 ر.س</h2>
          </div>
          <CircleDollarSign size={21} />
        </div>
        <div className={styles.donut}>
          <div>
            <strong>81%</strong>
            <span>من المستهدف</span>
          </div>
        </div>
        <p className={styles.mutedLine}>44,000 ر.س قيد التحصيل</p>
      </section>

      <section className={styles.agendaPanel}>
        <div className={styles.panelHeading}>
          <div>
            <span>الموعد القادم</span>
            <h2>جلسة عن بعد</h2>
          </div>
          <CalendarDays size={21} />
        </div>
        <div className={styles.nextEvent}>
          <div className={styles.eventDate}>
            <strong>26</strong>
            <span>يوليو</span>
          </div>
          <div>
            <strong>11:30 صباحًا</strong>
            <p>منازعة عقد عمل</p>
            <small>الدائرة العمالية الرابعة</small>
          </div>
        </div>
        <button type="button" onClick={() => onAction("تم تجهيز رابط الجلسة")}>
          عرض تفاصيل الجلسة
        </button>
      </section>

      <section className={styles.casesPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>متابعة الملفات</span>
            <h2>القضايا ذات الأولوية</h2>
          </div>
          <button type="button" onClick={() => onAction("تم فتح كل القضايا")}>
            عرض الكل
            <ArrowLeft size={15} />
          </button>
        </div>
        <CaseTable compact onAction={onAction} />
      </section>

      <section className={styles.activityPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>آخر التحديثات</span>
            <h2>نشاط المكتب</h2>
          </div>
        </div>
        <Activity
          icon={FileCheck2}
          title="تم اعتماد مذكرة الرد"
          meta="سارة القحطاني · منذ 12 دقيقة"
        />
        <Activity
          icon={CircleDollarSign}
          title="استلام دفعة بقيمة 11,500 ر.س"
          meta="ريم المطيري · منذ 35 دقيقة"
        />
        <Activity
          icon={MessageSquareText}
          title="رسالة من شركة رِمال"
          meta="بوابة العميل · منذ ساعة"
        />
        <Activity
          icon={Users}
          title="إضافة موكل جديد"
          meta="نورة العتيبي · أمس"
        />
      </section>
    </div>
  );
}

function CaseTable({
  compact = false,
  onAction,
}: {
  compact?: boolean;
  onAction: (message?: string) => void;
}) {
  const rows = compact ? cases.slice(0, 3) : cases;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>رقم القضية</th>
            <th>الملف</th>
            <th>الموكل</th>
            {!compact && <th>المحامي</th>}
            <th>الموعد القادم</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={item.number}
              onClick={() => onAction(`تم فتح القضية ${item.number}`)}
            >
              <td dir="ltr">{item.number}</td>
              <td>
                <strong>{item.title}</strong>
              </td>
              <td>{item.client}</td>
              {!compact && <td>{item.lawyer}</td>}
              <td>{item.next}</td>
              <td>
                <Status tone={item.tone}>{item.status}</Status>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientTable({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <div className={styles.tablePanel}>
      <div className={styles.sectionHead}>
        <div>
          <span>قاعدة الموكلين</span>
          <h2>الملفات الأحدث</h2>
        </div>
      </div>
      <div className={styles.clientGrid}>
        {clients.map((client) => (
          <button
            type="button"
            key={client.name}
            className={styles.clientRow}
            onClick={() => onAction(`تم فتح ملف ${client.name}`)}
          >
            <span className={styles.clientAvatar}>{client.name.slice(0, 1)}</span>
            <span className={styles.clientName}>
              <strong>{client.name}</strong>
              <small>{client.contact}</small>
            </span>
            <span>
              <strong>{client.cases}</strong>
              <small>قضايا</small>
            </span>
            <span>
              <strong>{client.balance}</strong>
              <small>رصيد</small>
            </span>
            <Status tone={client.portal === "مفعّلة" ? "green" : "amber"}>
              {client.portal}
            </Status>
            <ChevronLeft size={17} />
          </button>
        ))}
      </div>
    </div>
  );
}

function TasksView({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <div className={styles.tasksLayout}>
      {["عاجلة", "قيد التنفيذ", "قيد المراجعة", "مكتملة"].map(
        (column, columnIndex) => (
          <section key={column} className={styles.taskColumn}>
            <div className={styles.taskColumnHead}>
              <h2>{column}</h2>
              <span>{columnIndex === 3 ? 6 : columnIndex + 2}</span>
            </div>
            {tasks
              .filter((_, taskIndex) =>
                columnIndex === 3 ? taskIndex === 3 : taskIndex !== 3
              )
              .slice(0, columnIndex === 3 ? 1 : 2)
              .map((task, index) => (
                <button
                  type="button"
                  key={`${column}-${task.title}-${index}`}
                  className={styles.taskCard}
                  onClick={() => onAction(`تم فتح المهمة: ${task.title}`)}
                >
                  <span className={styles.taskCase}>{task.case}</span>
                  <strong>{task.title}</strong>
                  <p>{task.owner}</p>
                  <div>
                    <span>
                      <Clock3 size={14} />
                      {task.due}
                    </span>
                    <Status tone={task.done ? "green" : "amber"}>
                      {task.priority}
                    </Status>
                  </div>
                </button>
              ))}
            <button
              type="button"
              className={styles.addTask}
              onClick={() => onAction("إضافة المهام متاحة بعد التفعيل")}
            >
              <Plus size={16} />
              إضافة مهمة
            </button>
          </section>
        )
      )}
    </div>
  );
}

function CalendarView({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <div className={styles.calendarLayout}>
      <section className={styles.monthPanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>تقويم المكتب</span>
            <h2>يوليو 2026</h2>
          </div>
          <div className={styles.calendarControls}>
            <button type="button">اليوم</button>
            <button type="button">الأسبوع</button>
            <button type="button" className={styles.selectedControl}>
              الشهر
            </button>
          </div>
        </div>
        <div className={styles.calendarWeek}>
          {["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"].map(
            (day) => (
              <span key={day}>{day}</span>
            )
          )}
        </div>
        <div className={styles.calendarDays}>
          {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
            <button
              type="button"
              key={day}
              className={day === 24 ? styles.today : ""}
              onClick={() => onAction(`تم اختيار يوم ${day} يوليو`)}
            >
              <span>{day}</span>
              {[4, 10, 15, 18, 24, 26, 28].includes(day) && <i />}
            </button>
          ))}
        </div>
      </section>
      <section className={styles.timelinePanel}>
        <div className={styles.sectionHead}>
          <div>
            <span>الأيام القادمة</span>
            <h2>4 مواعيد مهمة</h2>
          </div>
        </div>
        {calendarEvents.map((event) => (
          <button
            type="button"
            key={`${event.day}-${event.time}`}
            className={styles.timelineEvent}
            onClick={() => onAction(`تم فتح: ${event.title}`)}
          >
            <span className={`${styles.timelineDot} ${styles[event.tone]}`} />
            <span className={styles.timelineTime}>
              <strong>{event.time}</strong>
              <small>{event.day}</small>
            </span>
            <span className={styles.timelineCopy}>
              <strong>{event.title}</strong>
              <small>{event.meta}</small>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

function FinanceTable({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <GenericTable
      headers={["رقم الفاتورة", "الموكل", "الإجمالي", "الاستحقاق", "الحالة"]}
      rows={financeRows.map((row) => [
        row.invoice,
        row.client,
        row.amount,
        row.due,
        row.status,
      ])}
      onAction={onAction}
    />
  );
}

function ContractTable({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <GenericTable
      headers={["رقم الاتفاقية", "الموكل", "الخدمة", "القيمة شاملة الضريبة", "الدفعات", "الحالة"]}
      rows={contracts.map((row) => [
        row.number,
        row.client,
        row.service,
        row.total,
        row.installments,
        row.status,
      ])}
      onAction={onAction}
    />
  );
}

function DocumentTable({ onAction }: { onAction: (message?: string) => void }) {
  return (
    <GenericTable
      headers={["اسم الملف", "القضية", "أضيف بواسطة", "الحجم", "الحالة"]}
      rows={documents.map((row) => [
        row.name,
        row.case,
        row.owner,
        row.size,
        row.status,
      ])}
      onAction={onAction}
    />
  );
}

function GenericTable({
  headers,
  rows,
  onAction,
}: {
  headers: string[];
  rows: string[][];
  onAction: (message?: string) => void;
}) {
  return (
    <div className={styles.tablePanel}>
      <div className={styles.sectionHead}>
        <div>
          <span>سجل محدث</span>
          <h2>آخر العمليات</h2>
        </div>
        <button type="button" onClick={() => onAction("تم تجهيز التصدير")}>
          تصدير
          <ArrowLeft size={15} />
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[0]}
                onClick={() => onAction(`تم فتح ${row[0]}`)}
              >
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`}>
                    {index === row.length - 1 ? (
                      <Status
                        tone={
                          /مدفوعة|سارية|مكتملة|مفهرس/.test(cell)
                            ? "green"
                            : /انتظار|مستحقة|جزئي/.test(cell)
                              ? "amber"
                              : "blue"
                        }
                      >
                        {cell}
                      </Status>
                    ) : index === 0 ? (
                      <strong>{cell}</strong>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Status({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: string;
}) {
  return (
    <span className={`${styles.status} ${styles[`status-${tone}`]}`}>
      {children}
    </span>
  );
}

function Activity({
  icon: Icon,
  title,
  meta,
}: {
  icon: IconType;
  title: string;
  meta: string;
}) {
  return (
    <div className={styles.activityRow}>
      <span>
        <Icon aria-hidden size={17} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
    </div>
  );
}

function Notice({
  icon: Icon,
  title,
  body,
}: {
  icon: IconType;
  title: string;
  body: string;
}) {
  return (
    <button type="button" className={styles.noticeRow}>
      <span>
        <Icon aria-hidden size={17} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
    </button>
  );
}
