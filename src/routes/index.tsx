import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Truck, FileText, Pill, Baby, Stethoscope, Sparkles, HeartPulse, Leaf, Bot,
  ChevronLeft, ShieldCheck, Clock3, BadgePercent, Beaker, MessageCircle,
  MapPin, Phone, Navigation, Brain, ScanSearch, PillBottle,
} from "lucide-react";


import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { NunDivider } from "@/components/nun-divider";
import { ProductCard } from "@/components/product-card";
import { useI18n } from "@/lib/i18n";
import { useMergedProducts } from "@/lib/use-merged-products";
import { waLink } from "@/lib/whatsapp";
import storefrontAsset from "@/assets/pharmacy-storefront.png.asset.json";
import robotAsset from "@/assets/pharmacy-robot.png.asset.json";
import nightAsset from "@/assets/pharmacy-night.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "صيدلية المصلي — أدويتك ومنتجاتك الطبية في عدن" },
      { name: "description", content: "تسوّق الأدوية، فيتامينات NOW، الأجهزة الطبية ومنتجات العناية مع توصيل سريع وأتمتة الطلبات عبر واتساب." },
      { property: "og:title", content: "صيدلية المصلي — أدويتك ومنتجاتك الطبية في عدن" },
      { property: "og:description", content: "أكثر من 5,000 منتج طبي وفيتامينات أصلية مع تجهيز آلي للطلب وتوصيل موثوق داخل عدن وجميع المحافظات." },
      { property: "og:url", content: "https://muslly.com/" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Pharmacy",
          name: "صيدلية المصلي",
          url: "https://muslly.com/",
          telephone: "+967782878280",
          image: ["https://muslly.com/__l5e/assets-v1/9c1460dd-af0c-45ba-a815-04964361e9e2/pharmacy-storefront.png"],
          address: {
            "@type": "PostalAddress",
            streetAddress: "المنصورة",
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
  const products = useMergedProducts();
  const { t } = useI18n();
  const featured = useMemo(
    () => products.filter((p) => query.trim() === "" || p.name.includes(query.trim())).slice(0, 8),
    [query, products],
  );
  const nowProducts = useMemo(() => products.filter((p) => p.cat === "now").slice(0, 4), [products]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader search={query} onSearch={setQuery} />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-10">
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
              { src: storefrontAsset.url, alt: "واجهة صيدلية المصلي في عدن — المنصورة" },
              { src: robotAsset.url, alt: "أتمتة تجهيز الأدوية داخل صيدلية المصلي" },
              { src: nightAsset.url, alt: "صيدلية المصلي ليلاً — خدمة 24 ساعة" },
            ].map((im) => (
              <div key={im.src} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <img src={im.src} alt={im.alt} loading="lazy" decoding="async" className="aspect-square w-full object-cover transition hover:scale-[1.03]" />
              </div>
            ))}
          </div>
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
      </main>

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
