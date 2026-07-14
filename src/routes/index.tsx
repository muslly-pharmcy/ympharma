import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  Truck, FileText, Pill, Baby, Stethoscope, Sparkles, HeartPulse, Leaf, Bot,
  ChevronLeft, ShieldCheck, Clock3, BadgePercent, Beaker, MessageCircle,
  MapPin, Phone, Navigation, Brain, ScanSearch, PillBottle,
} from "lucide-react";


import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Logo3D } from "@/components/Logo3D";
import { useLogoVariant } from "@/hooks/use-logo-variant";
import { ConditionsStrip } from "@/components/conditions-strip";
import { MarketingBanner } from "@/components/marketing-banner";
import { NunDivider } from "@/components/nun-divider";
import { ProductCard } from "@/components/product-card";
import { useI18n } from "@/lib/i18n";
import { useHomepageBundle } from "@/lib/use-homepage-bundle";
import { useLegacyMap } from "@/lib/use-pharmacy-intel";
import { waLink } from "@/lib/whatsapp";
import { UnifiedSearch } from "@/modules/visitor/components/UnifiedSearch";
import { useVisitorAnalytics } from "@/modules/visitor/analytics/useVisitorAnalytics";
import storefrontUrl from "@/assets/pharmacy-storefront.jpg";
import robotUrl from "@/assets/pharmacy-robot.jpg";
import nightUrl from "@/assets/pharmacy-night.jpg";

const DoctorDiscoveryEntry = lazy(() => import("@/modules/visitor/components/DoctorDiscoveryEntry"));
const HealthEducationPreview = lazy(() => import("@/modules/visitor/components/HealthEducationPreview"));
const WhatsNew = lazy(() => import("@/modules/visitor/components/WhatsNew"));
const NotificationNudge = lazy(() => import("@/modules/visitor/components/NotificationNudge"));
const PlatformUpdates = lazy(() => import("@/modules/visitor/components/PlatformUpdates"));
const NotificationOptIn = lazy(() => import("@/modules/visitor/components/NotificationOptIn"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "صيدلية المصلي — أدويتك ومنتجاتك الطبية في عدن" },
      { name: "description", content: "تسوّق الأدوية، فيتامينات NOW، الأجهزة الطبية ومنتجات العناية مع توصيل سريع وأتمتة الطلبات عبر واتساب." },
      { property: "og:title", content: "صيدلية المصلي — أدويتك ومنتجاتك الطبية في عدن" },
      { property: "og:description", content: "أكثر من 5,000 منتج طبي وفيتامينات أصلية مع تجهيز آلي للطلب وتوصيل موثوق داخل عدن وجميع المحافظات." },
      { property: "og:url", content: "https://muslly.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://muslly.com/" },
      { rel: "preload", as: "image", href: storefrontUrl, fetchPriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Pharmacy",
          name: "صيدلية المصلي",
          url: "https://muslly.com/",
          telephone: "+967782878280",
          image: ["https://muslly.com/__l5e/assets-v1/a8ea62c1-1cf3-4707-a017-db411980bb36/pharmacy-storefront.jpg"],
          address: {
            "@type": "PostalAddress",
            streetAddress: "المنصورة — ريمي، أمام مستشفى صابر",
            addressLocality: "عدن",
            addressCountry: "YE",
          },
          geo: { "@type": "GeoCoordinates", latitude: 12.8537392, longitude: 44.9903458 },
          hasMap: "https://maps.app.goo.gl/ZK1a6kAGn1KdUgSF9",
          openingHours: "Mo-Su 08:00-24:00",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "صيدلية المصلي",
          url: "https://muslly.com/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://muslly.com/products?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "صيدلية المصلي",
          url: "https://muslly.com/",
          logo: "https://muslly.com/icon-512.png",
          telephone: "+967782878280",
        }),
      },
    ],
  }),
  component: Home,
});

const cats = [
  { id: "medicine", name: "الأدوية", icon: Pill, tint: "from-sky-100 to-sky-50 text-sky-600" },
  { id: "kids", name: "الأم والطفل", icon: Baby, tint: "from-pink-100 to-pink-50 text-pink-600" },
  { id: "devices", name: "أجهزة طبية", icon: Stethoscope, tint: "from-indigo-100 to-indigo-50 text-indigo-600" },
  { id: "cosmetics", name: "العناية", icon: Sparkles, tint: "from-fuchsia-100 to-fuchsia-50 text-fuchsia-600" },
  { id: "vitamins", name: "فيتامينات", icon: HeartPulse, tint: "from-emerald-100 to-emerald-50 text-emerald-600" },
  { id: "now", name: "NOW Foods", icon: Beaker, tint: "from-amber-100 to-amber-50 text-amber-700" },
  { id: "herbal", name: "أعشاب", icon: Leaf, tint: "from-lime-100 to-lime-50 text-lime-700" },
];

function Home() {
  const [query, setQuery] = useState("");
  const [trackId, setTrackId] = useState("");
  const navigate = useNavigate();
  useVisitorAnalytics();
  const { products, sections, banners } = useHomepageBundle();
  const { t } = useI18n();
  const legacyMap = useLegacyMap(products);
  const featured = useMemo(
    () => products.filter((p) => query.trim() === "" || p.name.includes(query.trim())).slice(0, 8),
    [query, products],
  );
  const nowProducts = useMemo(() => products.filter((p) => p.cat === "now").slice(0, 4), [products]);
  const intelSections = useMemo(
    () => sections
      .map((s) => ({
        ...s,
        products: (s.legacy_ids ?? []).map((id) => legacyMap.get(id)).filter(Boolean) as typeof products,
      }))
      .filter((s) => s.products.length >= 2)
      .slice(0, 8),
    [sections, legacyMap],
  );

  const { url: heroLogoUrl } = useLogoVariant();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader search={query} onSearch={setQuery} />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-10">
        <Logo3D className="w-full" logoUrl={heroLogoUrl} />
        <section aria-label="بحث صحي موحّد">
          <UnifiedSearch />
        </section>
        <MarketingBanner placement="home" banners={banners} />
        <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] items-center overflow-hidden rounded-2xl brand-gradient p-6 text-primary-foreground shadow-elevated sm:p-10">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-bold ring-1 ring-white/25">
              <Sparkles className="size-3.5" /> {t("hero.badge")}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-[1.15] sm:text-4xl lg:text-5xl">
              {t("hero.title1")}
              <br />
              <span className="text-white/90">{t("hero.title2")}</span>
            </h1>
            <p className="mt-2 text-sm font-bold text-white/80 italic">— {t("hero.tagline")}</p>
            <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
              {t("hero.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex items-center gap-2 rounded-md bg-card px-5 py-3 text-sm font-black text-primary-deep shadow-lg transition hover:scale-[1.02]">
                {t("hero.shop")} <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
              <Link to="/prescription" className="inline-flex items-center gap-2 rounded-md bg-white/15 px-5 py-3 text-sm font-black ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25">
                <FileText className="size-4" /> {t("hero.prescription")}
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 text-foreground shadow-elevated ring-1 ring-white/40">
            <h3 className="text-lg font-black">{t("track.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("track.subtitle")}</p>
            <form
              onSubmit={(e) => { e.preventDefault(); const id = trackId.trim(); if (id) navigate({ to: "/track", search: { id } }); }}
              className="mt-3 grid grid-cols-[1fr_auto] gap-2"
            >
              <input
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder={t("track.placeholder")}
                className="min-h-11 rounded-md border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary"
              />
              <button className="rounded-md bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-deep">{t("track.button")}</button>
            </form>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { t: "24/7", s: "خدمة واستقبال طلبات" },
                { t: "100%", s: "منتجات أصلية" },
                { t: "+5,000", s: "منتج طبي متوفر" },
                { t: "ساعة", s: "توصيل داخل عدن" },
              ].map((s) => (
                <div key={s.s} className="rounded-md border border-border bg-secondary/40 p-3">
                  <strong className="block text-base text-primary-deep">{s.t}</strong>
                  <span className="text-[11px] text-muted-foreground">{s.s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "منتجات أصلية 100%", s: "من موردين معتمدين" },
            { icon: Clock3, t: "خدمة 24/7", s: "اطلب في أي وقت" },
            { icon: BadgePercent, t: "أفضل الأسعار", s: "عروض يومية وحصرية" },
            { icon: Truck, t: "شحن لجميع المحافظات", s: "توصيل سريع وموثوق" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-3 rounded-md p-3 transition hover:bg-secondary/60">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><b.icon className="size-5" /></div>
              <div className="min-w-0">
                <p className="truncate font-black text-sm">{b.t}</p>
                <p className="truncate text-xs text-muted-foreground">{b.s}</p>
              </div>
            </div>
          ))}
        </section>

        <NunDivider />

        <section>
          <SectionHeader title="من داخل صيدلية المصلي" subtitle="فرعنا في عدن — المنصورة" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { src: storefrontUrl, alt: "واجهة صيدلية المصلي في عدن — المنصورة", eager: true },
              { src: robotUrl, alt: "أتمتة تجهيز الأدوية داخل صيدلية المصلي", eager: false },
              { src: nightUrl, alt: "صيدلية المصلي ليلاً — خدمة 24 ساعة", eager: false },
            ].map((im) => (
              <div key={im.src} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <img
                  src={im.src}
                  alt={im.alt}
                  loading={im.eager ? "eager" : "lazy"}
                  fetchPriority={im.eager ? "high" : "auto"}
                  decoding="async"
                  width="800"
                  height="800"
                  className="aspect-square w-full object-cover transition hover:scale-[1.03]"
                />
              </div>
            ))}
          </div>
        </section>

        <NunDivider />

        <section>
          <SectionHeader title="تسوّق حسب الحالة" subtitle="منتجات مختارة لحالتك المرضية" />
          <ConditionsStrip />
        </section>

        <NunDivider />

        <section>
          <SectionHeader title="تسوّق حسب الفئة" subtitle="اختر القسم الذي يناسبك" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
            {cats.map((c) => (
              <Link
                key={c.id}
                to="/products"
                search={{ cat: c.id }}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"
              >
                <div className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${c.tint} transition group-hover:scale-110`}>
                  <c.icon className="size-7" />
                </div>
                <span className="text-xs font-bold leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-500 to-emerald-600 p-6 text-white shadow-elevated sm:p-8">
          <div className="absolute -left-10 -top-10 size-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-white/20 backdrop-blur"><FileText className="size-7" /></div>
              <div>
                <h3 className="text-xl font-black sm:text-2xl">أرسل روشتتك واستلم أدويتك</h3>
                <p className="mt-1 text-sm text-white/85">صوّر الروشتة وأرفقها — نجهّز طلبك خلال دقائق.</p>
              </div>
            </div>
            <Link to="/prescription" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-lg transition hover:scale-[1.02]">
              ارفع الروشتة الآن <ChevronLeft className="size-4" />
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-card">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-bold text-emerald-900">
              <Bot className="me-1 inline size-4 text-emerald-600" />
              أتمتة الطلب مفعّلة: المنتجات، الروشتة، وتتبع الطلب تذهب إلى واتساب رقم اليمن
              <span dir="ltr" className="mx-1 text-emerald-700">+967 782 878 280</span>
            </p>
            <a
              href={waLink("مرحبًا، لدي استفسار من موقع صيدلية المصلي")}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-card transition hover:bg-emerald-600"
            ><MessageCircle className="size-4" /> تواصل واتساب</a>
          </div>
        </section>

        {intelSections.length > 0 && (
          <section className="space-y-6">
            <SectionHeader
              title="🩺 تسوّق حسب الحالة المرضية"
              subtitle="أقسام ذكية مُولّدة تلقائيًا من تصنيف الأدوية"
            />
            {intelSections.map((s) => (
              <div key={s.category}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h3 className="text-base font-black">🔥 {s.label}</h3>
                  <Link
                    to="/products"
                    search={{ q: s.label }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    عرض الكل ({s.count})
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {s.products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            ))}
          </section>
        )}


        <section>
          <SectionHeader
            title="منتجات NOW Foods الأصلية"
            subtitle="فيتامينات ومكملات أمريكية بجودة عالمية"
            action={<Link to="/products" search={{ cat: "now" }} className="text-sm font-bold text-primary hover:underline">عرض الكل</Link>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {nowProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        <section>
          <SectionHeader
            title="أحدث العروض"
            subtitle={`${featured.length} منتج`}
            action={<Link to="/products" className="text-sm font-bold text-primary hover:underline">عرض الكل</Link>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        <NunDivider />

        {/* Advanced AI-Powered Services */}
        <section>
          <SectionHeader title="خدمات متقدمة بتقنية الذكاء" subtitle="رعاية ذكية أسرع وأدق — حصري على صيدلية المصلي" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/ai-assistant" className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated">
              <div className="absolute -end-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
              <div className="relative">
                <div className="grid size-12 place-items-center rounded-2xl brand-gradient text-primary-foreground"><Brain className="size-6" /></div>
                <h3 className="mt-4 text-lg font-black">التفاعلات الدوائية</h3>
                <p className="mt-1 text-sm text-muted-foreground">اسأل عن أي تفاعل بين دوائين أو عشبة أو طعام — إجابة فورية ومستوى الخطورة.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-primary">جرّبها الآن <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></span>
              </div>
            </Link>

            <Link to="/ai-symptoms" className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated">
              <div className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Stethoscope className="size-6" /></div>
              <h3 className="mt-4 text-lg font-black">فحص الأعراض الأولي</h3>
              <p className="mt-1 text-sm text-muted-foreground">صف أعراضك واحصل على تقييم أولي وتوصية بالمنتج المناسب من صيدليتنا.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-primary">ابدأ التقييم <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></span>
            </Link>

            <Link to="/ai-supplement" className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated">
              <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><PillBottle className="size-6" /></div>
              <h3 className="mt-4 text-lg font-black">توصية مكملات شخصية</h3>
              <p className="mt-1 text-sm text-muted-foreground">أخبرنا عن هدفك الصحي ونرشّح لك المكمل الأنسب من NOW Foods.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-primary">احصل على توصية <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></span>
            </Link>

            <Link to="/prescription" className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ScanSearch className="size-6" /></div>
              <h3 className="mt-4 text-lg font-black">قراءة الروشتة الذكية</h3>
              <p className="mt-1 text-sm text-muted-foreground">صوّر روشتتك ونتولّى تجهيزها آليًا خلال دقائق.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-primary">ارفع روشتتك <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></span>
            </Link>
          </div>
        </section>

        <NunDivider />

        {/* Branch Locator / Contact */}
        <section>
          <SectionHeader title="فروعنا وكيفية الوصول" subtitle="نخدمك على مدار الساعة — اتصل أو زرنا" />
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <iframe
                title="موقع صيدلية المصلي على الخريطة"
                src="https://www.google.com/maps?q=12.8537392,44.9903458&hl=ar&z=16&output=embed"
                className="h-72 w-full sm:h-96"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-lg font-black">الفرع الرئيسي — المنصورة، ريمي</h3>
              <p className="mt-1 text-sm text-muted-foreground">عدن — المنصورة — ريمي، أمام مستشفى صابر، الجمهورية اليمنية</p>

              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 className="size-5" /></span>
                  <div>
                    <p className="font-black">ساعات العمل</p>
                    <p className="text-muted-foreground">يومياً 8 ص — 12 م · خدمة طلبات 24/7</p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Phone className="size-5" /></span>
                  <div>
                    <p className="font-black">اتصال مباشر</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <a href="tel:+967782878280" className="text-primary hover:underline" dir="ltr">+967 782 878 280</a>
                      <a href="tel:+967774068936" className="text-primary hover:underline" dir="ltr">+967 774 068 936</a>
                      <a href="tel:+96702358921" className="text-primary hover:underline" dir="ltr">02 358921</a>
                    </div>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin className="size-5" /></span>
                  <div>
                    <p className="font-black">العنوان</p>
                    <p className="text-muted-foreground">عدن — المنصورة — ريمي، أمام مستشفى صابر</p>
                  </div>
                </li>
              </ul>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <a href="https://maps.app.goo.gl/ZK1a6kAGn1KdUgSF9" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary-deep">
                  <Navigation className="size-4" /> ابدأ التوجيه
                </a>
                <a href="tel:+967782878280" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-black hover:bg-accent">
                  <Phone className="size-4" /> اتصل بنا
                </a>
              </div>
            </div>
          </div>
        </section>

        <DiscoveryGrid />

        <Suspense fallback={null}>
          <DoctorDiscoveryEntry />
        </Suspense>
        <Suspense fallback={null}>
          <HealthEducationPreview />
        </Suspense>
        <Suspense fallback={null}>
          <PlatformUpdates />
        </Suspense>
        <Suspense fallback={null}>
          <NotificationOptIn />
        </Suspense>
        <Suspense fallback={null}>
          <WhatsNew />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <NotificationNudge />
      </Suspense>

      <a
        href={waLink("مرحبًا، لدي استفسار")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="واتساب"
        className="fixed bottom-5 left-5 z-50 grid size-14 place-items-center rounded-full bg-emerald-500 text-white shadow-elevated transition hover:scale-110 animate-bounce"
      >
        <svg viewBox="0 0 24 24" className="size-7" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.27-1.12a9.9 9.9 0 0 0 5.77 1.84h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm5.83 14.13c-.25.69-1.43 1.32-1.98 1.4-.51.07-1.15.11-1.86-.12-.43-.13-.99-.32-1.7-.62-3-1.3-4.95-4.32-5.1-4.52-.15-.2-1.21-1.61-1.21-3.07s.76-2.18 1.03-2.48c.27-.3.59-.37.79-.37l.57.01c.18.01.43-.07.67.51.25.6.85 2.06.92 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.18.3.79 1.3 1.7 2.11 1.17 1.04 2.16 1.36 2.46 1.51.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.67-.15.27.1 1.72.81 2.02.96.3.15.5.22.57.35.07.12.07.71-.18 1.4z"/></svg>
      </a>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-black sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function DiscoveryGrid() {
  const items: Array<{ to: string; title: string; desc: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }> = [
    { to: "/products", title: "ابحث عن دواء", desc: "أدوية، فيتامينات ومكملات — بحث عربي/إنجليزي ذكي.", icon: Pill },
    { to: "/doctors", title: "ابحث عن طبيب", desc: "أطباء موثوقون في عدن حسب التخصص والمدينة.", icon: Stethoscope },
    { to: "/sahtak", title: "تثقيف صحي", desc: "مقالات ونصائح طبية موثّقة باللغة العربية.", icon: HeartPulse },
    { to: "/doctor/join", title: "شبكة الصيدليات — قريباً", desc: "نُجهّز شبكة صيدليات موحّدة لتوفّر أسرع للأدوية.", icon: PillBottle, soon: true },
  ];
  return (
    <section dir="rtl" aria-labelledby="discovery-title" className="mx-auto max-w-6xl px-4 py-8">
      <h2 id="discovery-title" className="mb-4 text-xl font-black sm:text-2xl">ماذا تريد أن تفعل اليوم؟</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.to + it.title}
              to={it.to}
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elevated"
            >
              {it.soon && (
                <span className="absolute left-3 top-3 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  قريباً
                </span>
              )}
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="mt-3">
                <div className="text-sm font-black">{it.title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{it.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
