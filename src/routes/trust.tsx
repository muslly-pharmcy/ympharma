import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Database, Users, Cookie, FileText, Mail, Phone, AlertCircle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "الأمان والخصوصية — صيدلية المصلي" },
      {
        name: "description",
        content:
          "صفحة الأمان والخصوصية في صيدلية المصلي — توضح ممارسات حماية البيانات، ملفات الكوكيز، الاحتفاظ بالبيانات، وكيفية التواصل بشأن أي مخاوف.",
      },
      { property: "og:title", content: "الأمان والخصوصية — صيدلية المصلي" },
      {
        property: "og:description",
        content: "كيف نحمي بياناتك في صيدلية المصلي ومن نشاركها معه ولماذا.",
      },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/trust" }],
  }),
  component: TrustPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Shield;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground md:text-xl">{title}</h2>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground md:text-base">
        {children}
      </div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الرئيسية
        </Link>

        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" />
            الأمان والخصوصية
          </div>
          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">
            كيف نحمي بياناتك
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            هذه الصفحة يحررها فريق صيدلية المصلي للإجابة عن الأسئلة الشائعة حول الأمان
            والخصوصية. المعلومات هنا تصف ممارساتنا الحالية وليست شهادة اعتماد مستقلة.
          </p>
        </header>

        <div className="space-y-4">
          <Section icon={Lock} title="الدخول وحماية الحسابات">
            <p>
              تسجيل الدخول لإدارة المتجر يتم عبر بريد إلكتروني وكلمة سر أو حساب Google.
              صلاحيات الموظفين موزعة على أدوار محددة (مالك، مدير، صلاحيات جزئية)، ولا يستطيع
              أي موظف الوصول إلى بيانات خارج صلاحياته.
            </p>
            <p>
              الزوار العاديون لا يحتاجون إلى تسجيل دخول لتصفح المنتجات أو إرسال طلب أو روشتة.
            </p>
          </Section>

          <Section icon={Database} title="البيانات التي نجمعها">
            <ul className="list-inside list-disc space-y-1">
              <li>بيانات الطلب: الاسم، رقم الهاتف، العنوان، والأصناف المطلوبة.</li>
              <li>صور الروشتات التي يرفعها المستخدم لمعالجتها وتجهيز الطلب.</li>
              <li>بيانات تقنية أساسية (نوع الجهاز، نوع المتصفح) لتشغيل التطبيق وتحسينه.</li>
            </ul>
            <p>
              لا نطلب أي بيانات حساسة إضافية، ولا نبيع بياناتك لأي طرف ثالث لأغراض تسويقية.
            </p>
          </Section>

          <Section icon={Shield} title="حماية البيانات أثناء النقل والتخزين">
            <p>
              جميع الاتصالات بين المتصفح والخادم مشفّرة عبر HTTPS. بيانات الطلبات والروشتات
              مخزّنة في قاعدة بيانات سحابية محمية بصلاحيات صفية (Row Level Security) بحيث لا
              يمكن لأي مستخدم الوصول إلى بيانات مستخدم آخر.
            </p>
            <p>
              صور الروشتات محفوظة في حاوية تخزين خاصة (غير عامة) ويتم الوصول إليها فقط من قِبَل
              فريق الصيدلية المخوّل.
            </p>
          </Section>

          <Section icon={Users} title="الأطراف الثالثة (Subprocessors)">
            <p>نعتمد على مزوّدين موثوقين لتشغيل الخدمة:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Supabase / Lovable Cloud — استضافة قاعدة البيانات والتخزين والمصادقة.</li>
              <li>WhatsApp Business API — لإرسال إشعارات الطلب للعميل وللصيدلية فقط.</li>
              <li>Google — تسجيل الدخول الاختياري لفريق العمل.</li>
            </ul>
          </Section>

          <Section icon={Cookie} title="الكوكيز والتخزين المحلي">
            <p>
              نستخدم تخزينًا محليًا في المتصفح (localStorage) لحفظ السلة، تفضيلات اللغة،
              وجلسة تسجيل دخول الموظفين. لا نستخدم كوكيز إعلانية ولا نتتبع المستخدم عبر مواقع
              أخرى.
            </p>
          </Section>

          <Section icon={FileText} title="الاحتفاظ بالبيانات والحذف">
            <p>
              نحتفظ ببيانات الطلبات والروشتات للفترة اللازمة لإتمام الخدمة والاحتفاظ بسجل
              العمليات الإدارية. يمكنك طلب حذف بياناتك في أي وقت بالتواصل معنا عبر الأرقام
              أدناه.
            </p>
          </Section>

          <Section icon={AlertCircle} title="الإبلاغ عن مشكلة أمنية">
            <p>
              إذا اكتشفت مشكلة أمنية أو تسريب محتمل، يُرجى التواصل معنا مباشرة قبل الإفصاح
              العلني. سنرد عليك ونعمل على المعالجة في أقرب وقت ممكن.
            </p>
          </Section>

          <Section icon={Mail} title="تواصل معنا">
            <div className="space-y-1">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                واتساب: 774068936 / 02358921 (أرضي)
              </p>
              <p>العنوان: عدن — المنصورة — ريمي — أمام مشفى صابر</p>
            </div>
          </Section>
        </div>

        <footer className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          هذه الصفحة محتوى تحرّره صيدلية المصلي ويُحدَّث من حين لآخر. وهي ليست شهادة اعتماد
          أو تدقيق مستقل، ولا تحلّ محل أي اتفاقية قانونية مع المستخدم.
        </footer>
      </div>
    </div>
  );
}
