import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Database, Cookie, FileText, Mail, Phone, AlertCircle, ArrowRight, Users } from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "الأمان والخصوصية — صيدلية المصلي" },
      {
        name: "description",
        content:
          "صفحة الأمان والخصوصية في صيدلية المصلي — توضح ممارسات حماية البيانات، الكوكيز، الاحتفاظ بالبيانات، وكيفية الإبلاغ عن أي مشكلة.",
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

type TrustData = {
  title: string;
  intro: string;
  data_collection: string;
  retention: string;
  encryption: string;
  cookies: string;
  incident_reporting: string;
  contact: string;
};

const FALLBACK: TrustData = {
  title: "كيف نحمي بياناتك",
  intro:
    "هذه الصفحة يحررها فريق صيدلية المصلي للإجابة عن الأسئلة الشائعة حول الأمان والخصوصية. المعلومات هنا تصف ممارساتنا الحالية وليست شهادة اعتماد مستقلة.",
  data_collection:
    "نجمع فقط البيانات اللازمة لتنفيذ الطلب: الاسم، رقم الهاتف، العنوان، الأصناف المطلوبة، وصور الروشتات. لا نطلب بيانات حساسة إضافية ولا نبيع بياناتك لأي طرف ثالث.",
  retention:
    "نحتفظ ببيانات الطلبات والروشتات للفترة اللازمة لتنفيذ الخدمة وأغراض السجل الإداري. يمكنك طلب حذف بياناتك في أي وقت عبر التواصل معنا.",
  encryption:
    "كل الاتصالات بين المتصفح وخوادمنا مشفّرة عبر HTTPS. قاعدة البيانات محمية بسياسات صلاحيات صفية (Row Level Security)، وصور الروشتات تُخزّن في حاوية خاصة غير عامة.",
  cookies:
    "نستخدم تخزينًا محليًا في المتصفح (localStorage) لحفظ السلة وتفضيلات اللغة وجلسة الموظفين. لا نستخدم كوكيز إعلانية ولا نتتبّع المستخدمين عبر مواقع أخرى.",
  incident_reporting:
    "إذا اكتشفت ثغرة أمنية أو تسريبًا محتملًا، نرجو التواصل معنا مباشرة قبل أي إفصاح علني وسنرد بأسرع وقت ممكن.",
  contact:
    "واتساب: 774068936 — أرضي: 02358921 — العنوان: عدن — المنصورة — ريمي، أمام مشفى صابر.",
};

function Section({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Shield;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground md:text-xl">{title}</h2>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base">
        {body}
      </p>
    </section>
  );
}

function TrustPage() {
  const [data, setData] = useState<TrustData>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("trust_pages")
      .select("*")
      .eq("slug", "trust")
      .maybeSingle()
      .then(({ data: row }) => {
        if (cancelled || !row) return;
        setData({
          title: row.title || FALLBACK.title,
          intro: row.intro || FALLBACK.intro,
          data_collection: row.data_collection || FALLBACK.data_collection,
          retention: row.retention || FALLBACK.retention,
          encryption: row.encryption || FALLBACK.encryption,
          cookies: row.cookies || FALLBACK.cookies,
          incident_reporting: row.incident_reporting || FALLBACK.incident_reporting,
          contact: row.contact || FALLBACK.contact,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="trust-page">
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
          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{data.title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base">
            {data.intro}
          </p>
        </header>

        <div className="space-y-4">
          <Section icon={Database} title="جمع البيانات" body={data.data_collection} />
          <Section icon={FileText} title="الاحتفاظ بالبيانات والحذف" body={data.retention} />
          <Section icon={Lock} title="التشفير وحماية البيانات" body={data.encryption} />
          <Section icon={Cookie} title="الكوكيز والتخزين المحلي" body={data.cookies} />
          <Section icon={Users} title="الأطراف الثالثة" body="Supabase / Lovable Cloud (قاعدة البيانات والتخزين)، WhatsApp Business API (إشعارات الطلب)، Google (تسجيل دخول الفريق)." />
          <Section icon={AlertCircle} title="الإبلاغ عن مشكلة أمنية" body={data.incident_reporting} />
          <Section icon={Mail} title="تواصل معنا" body={data.contact} />
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground" dir="ltr">
          <Phone className="size-3.5 text-primary" /> +967 774 068 936 · +967 2 358921
        </p>

        <footer className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          هذه الصفحة محتوى تحرّره صيدلية المصلي ويُحدَّث من حين لآخر. وهي ليست شهادة اعتماد أو تدقيق مستقل، ولا تحلّ محل أي اتفاقية قانونية مع المستخدم.
        </footer>
      </div>
    </div>
  );
}
