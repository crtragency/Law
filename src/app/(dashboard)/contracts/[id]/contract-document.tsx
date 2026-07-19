import { formatMoneyLabel, computeTax, parseInstallments } from "@/lib/money";
import type { FirmSettings } from "@/lib/firm";

interface ClientData {
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  nationalId: string | null;
  nationality: string | null;
  companyName: string | null;
  unifiedNumber: string | null;
  taxNumber: string | null;
  address: string | null;
  phone: string | null;
}

interface ContractData {
  number: string;
  city: string | null;
  dateHijri: string | null;
  dateGregorian: Date | null;
  scope: string;
  amountBeforeTax: number;
  taxRate: number;
  installments: unknown;
}

const ORDINALS = [
  "أولاً",
  "ثانياً",
  "ثالثاً",
  "رابعاً",
  "خامساً",
  "سادساً",
  "سابعاً",
  "ثامناً",
  "تاسعاً",
  "عاشراً",
];

const numWord = (n: number) => {
  const w = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
  return w[n] ?? `${n + 1}`;
};

/** مستند اتفاقية الأتعاب — مطابق لبنية النموذج الرسمي، جاهز للطباعة. */
export function ContractDocument({
  firm,
  client,
  contract,
}: {
  firm: FirmSettings;
  client: ClientData;
  contract: ContractData;
}) {
  const { tax, total } = computeTax(contract.amountBeforeTax, contract.taxRate);
  const installments = parseInstallments(contract.installments);
  const city = contract.city || firm.city || firm.address || "";
  const scopeLines = contract.scope
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const gregorian = contract.dateGregorian
    ? new Intl.DateTimeFormat("ar", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        contract.dateGregorian
      )
    : "";

  return (
    <div className="print-sheet mx-auto max-w-3xl rounded-lg border border-line bg-white p-8 leading-loose text-ink sm:p-12">
      {/* الترويسة */}
      <div className="mb-6 text-center">
        <p className="mb-3 font-display text-sm">بسم الله الرحمن الرحيم</p>
        <h1 className="font-display text-xl font-bold">
          اتفاقية أتعاب محاماة {contract.number}
        </h1>
      </div>

      <p className="mb-3 text-sm">الحمد لله والصلاة والسلام على رسول الله وبعد:</p>

      <p className="mb-4 text-sm leading-loose">
        إنه في{contract.dateHijri ? ` تاريخ ${contract.dateHijri}` : " يوم"}{" "}
        {gregorian && `الموافق ${gregorian}م`}
        {city && ` بمدينة ${city}`} تم الاتفاق بين كلًا من:
      </p>

      {/* الطرف الأول */}
      <div className="mb-4 text-sm leading-loose">
        <p className="font-semibold">
          {firm.name}
          {firm.legalForm ? ` (${firm.legalForm})` : ""}
        </p>
        <p>ويشار إليها في هذه الاتفاقية بـ (الطرف الأول).</p>
        {(firm.licenseNumber || firm.address) && (
          <p>
            {firm.licenseNumber && `شهادة تسجيل شركة مهنية رقم (${firm.licenseNumber})`}
            {firm.address && `، عنوانها الرئيسي مدينة ${firm.address}`}
            {firm.branches && ` وفروعها ${firm.branches}`}
          </p>
        )}
        {(firm.phones || firm.email) && (
          <p dir="rtl">
            {firm.phones && <>جوال (<span dir="ltr">{firm.phones}</span>)</>}
            {firm.email && <>، بريد إلكتروني <span dir="ltr">{firm.email}</span></>}
          </p>
        )}
        {firm.managerName && <p>ويمثلها بالتوقيع {firm.managerName}.</p>}
      </div>

      {/* الطرف الثاني */}
      <div className="mb-4 text-sm leading-loose">
        {client.type === "COMPANY" ? (
          <p className="font-semibold">
            {client.companyName}
            {client.unifiedNumber && ` — الرقم الوطني الموحّد (${client.unifiedNumber})`}
            {client.taxNumber && `، الرقم الضريبي (${client.taxNumber})`}
            {client.name && `، ويمثلها/ ${client.name}`}
          </p>
        ) : (
          <p className="font-semibold">
            السيد/ {client.name}
            {client.nationalId && ` هوية وطنية رقم (${client.nationalId})`}
            {client.nationality && ` ${client.nationality} الجنسية`}
            {client.address && `، العنوان ${client.address}`}
            {client.phone && <>، وجوال رقم (<span dir="ltr">{client.phone}</span>)</>}.
          </p>
        )}
        <p>ويشار إليه في هذه الاتفاقية بـ (الطرف الثاني).</p>
      </div>

      {/* التمهيد */}
      <p className="mb-2 mt-6 text-center font-semibold">التمهيد</p>
      <p className="mb-4 text-sm leading-loose">
        حيث أن الطرف الثاني يرغب في تعيين شركة محاماة متخصصة بالمرافعة والمدافعة وتمثيل الغير أمام
        الجهات المختصة؛ وحيث أن الطرف الأول مرخّص له بمزاولة مهنة المحاماة والاستشارات القانونية،
        ويملك الخبرة والإمكانيات اللازمة لتقديم الخدمات القانونية؛ فقد اتفق الطرفان وهما بكامل
        الأوصاف المعتبرة شرعاً على ما يلي:
      </p>

      <ol className="space-y-3 text-sm leading-loose">
        <li>
          <b>{ORDINALS[0]}:</b> التمهيد السابق جزء لا يتجزأ من هذا العقد.
        </li>
        <li>
          <b>{ORDINALS[1]}:</b> اتفق الطرفان على أن تنحصر مهام الطرف الأول فيما يلي:
          <ul className="mr-5 mt-1 list-disc space-y-1">
            {scopeLines.length > 0 ? (
              scopeLines.map((line, i) => <li key={i}>{line}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </li>
        <li>
          <b>{ORDINALS[2]}:</b> اتفق الطرفان على أن تكون أتعاب الطرف الأول مبلغاً وقدره{" "}
          <b dir="ltr">({formatMoneyLabel(total)})</b> شاملة لضريبة القيمة المضافة بنسبة{" "}
          {contract.taxRate}% (قيمتها <span dir="ltr">{formatMoneyLabel(tax)}</span>) وغير شاملة
          لتكاليف التقاضي وأي رسوم تُطلب، وتُدفع على النحو التالي:
          {installments.length > 0 && (
            <ul className="mr-5 mt-1 list-disc space-y-1">
              {installments.map((inst, i) => (
                <li key={i}>
                  الدفعة {numWord(i)} <b dir="ltr">({formatMoneyLabel(inst.amount)})</b> شاملة ضريبة
                  القيمة المضافة{inst.note ? `، ${inst.note}` : ""}.
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <b>{ORDINALS[3]}:</b> إن التزام الطرف الأول بموجب هذه الاتفاقية هو التزام بذل عناية وليس
          تحقيق غاية، وبالتالي فإن الطرف الأول غير ملزم ولا يضمن تحقيق نتيجة محددة، وكل ما عليه هو
          بذل العناية والجهد اللازمين للوصول إلى نتيجة مناسبة حسب الوقائع المقدمة من الطرف الثاني.
        </li>
        <li>
          <b>{ORDINALS[4]}:</b> يقر الطرف الثاني بأن جميع المعلومات التي يقدمها للطرف الأول صحيحة،
          ويلتزم بتقديم كافة المستندات المطلوبة فور طلبها دون تأخير، ويتحمل وحده المسؤولية في حال
          مخالفة ذلك.
        </li>
        <li>
          <b>{ORDINALS[5]}:</b> اتفق الطرفان أن هذه الاتفاقية نهائية، ويستحق الطرف الأول أتعابه
          المذكورة في الفقرة (ثالثاً) كاملة غير منقوصة في حال إلغاء التوكيل أو التنازل أو فسخ
          الاتفاقية أو رغبة الطرف الثاني في متابعة الدعوى بنفسه أو بتوكيل طرف آخر أو حفظ الدعوى.
        </li>
        <li>
          <b>{ORDINALS[6]}:</b> يلتزم الطرفان بالمحافظة على سرية المعلومات المتعلقة بأعمال هذه
          الاتفاقية واستخدامها في أغراض تنفيذها فقط بما يحفظ حقوق الطرفين.
        </li>
        <li>
          <b>{ORDINALS[7]}:</b> عند قيام الطرف الأول بإنهاء العمل المكلّف به يُعد ذلك إخلاءً لطرفه
          وبراءة لذمته في مواجهة الطرف الثاني.
        </li>
        <li>
          <b>{ORDINALS[8]}:</b> في حال تطلّب تنفيذ المهام سفر الطرف الأول خارج{" "}
          {firm.address || "مقر المكتب"}
          {firm.branches ? ` و${firm.branches}` : ""} فتكون المصروفات والأتعاب في اتفاقية منفصلة، وذلك
          في حال موافقته على السفر.
        </li>
        <li>
          <b>{ORDINALS[9]}:</b> أي دعوى أو مهام أخرى تتفرّع من أصل المهام المتفق عليها تكون باتفاق
          منفصل عن هذه الاتفاقية.
        </li>
        <li>
          <b>الحادي عشر:</b> تعتبر هذه الاتفاقية ملزمة لطرفيها ولخلفاء الطرف الثاني أو من يمثلونه.
        </li>
        <li>
          <b>الثاني عشر:</b> في حال وقوع أي خلاف بين الطرفين بشأن تفسير أو تطبيق هذه الاتفاقية يكون
          الفصل فيه من اختصاص الجهات المختصة نظاماً في مدينة {city || "—"} بالمملكة العربية السعودية.
        </li>
        <li>
          <b>الثالث عشر:</b> أقرّ كلا الطرفين بأنهما اطّلعا على كافة بنود هذه الاتفاقية واستوعبا
          مقاصدها وقبلاها قبولاً تاماً ينفي الجهالة، وأنهما ملتزمان بها جملةً وتفصيلاً.
        </li>
      </ol>

      <p className="mt-6 text-sm">وعليه تم الإيجاب والقبول بين الطرفين وتم التوقيع، والله ولي التوفيق.</p>

      {/* التواقيع */}
      <div className="mt-12 grid grid-cols-2 gap-6 text-center text-sm">
        <div>
          <p className="font-semibold">الطرف الأول</p>
          <p className="mt-1">{firm.name}</p>
          {firm.managerName && <p className="mt-1 text-gray-600">{firm.managerName}</p>}
          <div className="mt-10 border-t border-gray-300 pt-1 text-xs text-gray-400">التوقيع</div>
        </div>
        <div>
          <p className="font-semibold">الطرف الثاني</p>
          <p className="mt-1">
            {client.type === "COMPANY" && client.companyName ? client.companyName : client.name}
          </p>
          <div className="mt-10 border-t border-gray-300 pt-1 text-xs text-gray-400">التوقيع</div>
        </div>
      </div>
    </div>
  );
}
