import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  ShoppingBag,
  MapPin,
  Phone,
  Truck,
  FileText,
  Pill,
  Baby,
  Stethoscope,
  Sparkles,
  HeartPulse,
  Leaf,
  Bot,
  ChevronLeft,
  Plus,
  ShieldCheck,
  Clock3,
  BadgePercent,
  Menu,
} from "lucide-react";

import logoAsset from "@/assets/almusalli-logo.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "صيدلية المصلي — صحتك تهمنا" },
      {
        name: "description",
        content:
          "تسوّق الأدوية، مستلزمات الأطفال، الأجهزة الطبية ومنتجات التجميل من صيدلية المصلي مع توصيل سريع لجميع المحافظات.",
      },
    ],
  }),
  component: Home,
});

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
};

const categories: Category[] = [
  { id: "medicine", name: "الأدوية", icon: Pill, tint: "from-sky-100 to-sky-50 text-sky-600" },
  { id: "kids", name: "الأم والطفل", icon: Baby, tint: "from-pink-100 to-pink-50 text-pink-600" },
  { id: "devices", name: "أجهزة طبية", icon: Stethoscope, tint: "from-indigo-100 to-indigo-50 text-indigo-600" },
  { id: "cosmetics", name: "العناية والتجميل", icon: Sparkles, tint: "from-fuchsia-100 to-fuchsia-50 text-fuchsia-600" },
  { id: "vitamins", name: "فيتامينات ومكملات", icon: HeartPulse, tint: "from-emerald-100 to-emerald-50 text-emerald-600" },
  { id: "herbal", name: "أعشاب طبيعية", icon: Leaf, tint: "from-lime-100 to-lime-50 text-lime-700" },
];

type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  oldPrice?: number;
  cat: string;
  img: string;
  badge?: string;
};

const products: Product[] = [
  { id: 1, name: "بانادول إكسترا 24 قرص", brand: "Panadol", price: 1850, oldPrice: 2400, cat: "medicine", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500", badge: "خصم 22%" },
  { id: 2, name: "حليب أطفال S-26 مرحلة 1", brand: "S-26", price: 9200, oldPrice: 10500, cat: "kids", img: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500", badge: "الأكثر مبيعاً" },
  { id: 3, name: "جهاز قياس ضغط الدم رقمي", brand: "Omron", price: 28500, oldPrice: 33000, cat: "devices", img: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500", badge: "جديد" },
  { id: 4, name: "كريم نيفيا للترطيب 200مل", brand: "Nivea", price: 3400, cat: "cosmetics", img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500" },
  { id: 5, name: "فيتامين C 1000mg — 60 قرص", brand: "Now Foods", price: 5600, oldPrice: 6500, cat: "vitamins", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500", badge: "خصم 14%" },
  { id: 6, name: "زيت حبة البركة العضوي", brand: "Natural", price: 2900, cat: "herbal", img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500" },
  { id: 7, name: "ميزان حرارة رقمي", brand: "Beurer", price: 4200, oldPrice: 5000, cat: "devices", img: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500" },
  { id: 8, name: "شامبو سيباميد للشعر الدهني", brand: "Sebamed", price: 6800, cat: "cosmetics", img: "https://images.unsplash.com/photo-1626015449431-9385c0afea90?w=500", badge: "موصى به" },
];

function formatPrice(n: number) {
  return n.toLocaleString("ar-EG");
}

const WHATSAPP = "967779301162";

function Home() {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (activeCat === "all" || p.cat === activeCat) &&
          (query.trim() === "" || p.name.includes(query.trim())),
      ),
    [activeCat, query],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="brand-gradient text-primary-foreground text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 sm:flex">
              <Truck className="size-3.5" /> توصيل سريع لجميع المحافظات
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> 779 301 162
            </span>
          </div>
          <div className="flex items-center gap-4 opacity-90">
            <a href="#" className="hover:underline">تتبع طلبك</a>
            <span className="hidden sm:inline">|</span>
            <a href="#" className="hidden sm:inline hover:underline">فروعنا</a>
          </div>
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <a href="/" className="flex items-center gap-3 shrink-0">
            <div className="brand-gradient grid size-12 place-items-center rounded-2xl shadow-card overflow-hidden ring-1 ring-white/30">
              <img src={logoAsset.url} alt="صيدلية المصلي" className="size-10 object-contain" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-lg font-black leading-none text-primary-deep">صيدلية المصلي</h1>
              <span className="text-[11px] font-bold text-muted-foreground">إحدى شركات دهسم</span>
            </div>
          </a>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن دواء، فيتامين، منتج عناية..."
              className="w-full rounded-2xl border border-border bg-secondary/60 py-3 pr-11 pl-4 text-sm font-medium outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="hidden md:flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground transition hover:bg-accent">
              <MapPin className="size-4 text-primary" />
              <span className="hidden lg:inline">صنعاء</span>
            </button>
            <button
              type="button"
              className="relative grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition hover:bg-accent"
              aria-label="السلة"
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="md:hidden grid size-11 place-items-center rounded-2xl bg-secondary" aria-label="القائمة">
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {/* Category strip */}
        <nav className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-2 text-sm font-bold">
            <button
              onClick={() => setActiveCat("all")}
              className={`whitespace-nowrap rounded-xl px-4 py-2 transition ${activeCat === "all" ? "brand-gradient text-primary-foreground shadow-card" : "text-muted-foreground hover:text-primary"}`}
            >
              كل المنتجات
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 transition ${activeCat === c.id ? "brand-gradient text-primary-foreground shadow-card" : "text-muted-foreground hover:text-primary"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-10">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-3xl brand-gradient p-8 text-primary-foreground shadow-elevated lg:col-span-2 lg:p-12">
            <div className="absolute -left-16 -top-16 size-64 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -right-10 bottom-0 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur">
                <Sparkles className="size-3.5" /> صحتك تهمّنا
              </span>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                كل احتياجاتك الطبية
                <br />
                <span className="text-white/90">بين يديك خلال ساعة</span>
              </h2>
              <p className="mt-3 text-sm text-white/85 sm:text-base">
                أكثر من 5,000 منتج طبي وعناية شخصية، أصلية ومضمونة، مع توصيل سريع لجميع المحافظات.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-2xl bg-card px-5 py-3 text-sm font-bold text-primary-deep shadow-lg transition hover:scale-[1.02]">
                  تسوّق الآن <ChevronLeft className="size-4" />
                </button>
                <a
                  href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("مرحبًا، أريد إرسال صورة الروشتة")}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/25"
                >
                  <FileText className="size-4" /> ارفع الروشتة
                </a>
              </div>
            </div>
          </div>

          {/* Side promo cards */}
          <div className="grid gap-4">
            <div className="rounded-3xl bg-card p-5 shadow-card ring-1 ring-border">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Truck className="size-6" />
              </div>
              <h3 className="mt-3 font-black text-base">توصيل في نفس اليوم</h3>
              <p className="mt-1 text-xs text-muted-foreground">داخل المدن الرئيسية عبر دهسم — مبرّد وآمن.</p>
            </div>
            <div className="rounded-3xl brand-gradient-soft p-5 shadow-card ring-1 ring-border">
              <div className="grid size-12 place-items-center rounded-2xl bg-card text-primary">
                <Bot className="size-6" />
              </div>
              <h3 className="mt-3 font-black text-base">المساعد الذكي</h3>
              <p className="mt-1 text-xs text-muted-foreground">استشارة دوائية فورية بالذكاء الاصطناعي.</p>
            </div>
          </div>
        </section>

        {/* ── Trust strip ─────────────────────────────────────── */}
        <section className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "منتجات أصلية 100%", s: "من موردين معتمدين" },
            { icon: Clock3, t: "خدمة 24/7", s: "اطلب في أي وقت" },
            { icon: BadgePercent, t: "أفضل الأسعار", s: "عروض يومية وحصرية" },
            { icon: Truck, t: "شحن لجميع المحافظات", s: "بالتعاون مع دهسم" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-secondary/60">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <b.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-sm">{b.t}</p>
                <p className="truncate text-xs text-muted-foreground">{b.s}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Categories ──────────────────────────────────────── */}
        <section>
          <SectionHeader title="تسوّق حسب الفئة" subtitle="اختر القسم الذي يناسبك" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"
              >
                <div className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${c.tint} transition group-hover:scale-110`}>
                  <c.icon className="size-7" />
                </div>
                <span className="text-xs font-bold leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Prescription banner ─────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-500 to-emerald-600 p-6 text-white shadow-elevated sm:p-8">
          <div className="absolute -left-10 -top-10 size-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <FileText className="size-7" />
              </div>
              <div>
                <h3 className="text-xl font-black sm:text-2xl">أرسل روشتتك واستلم أدويتك</h3>
                <p className="mt-1 text-sm text-white/85">صوّر الروشتة وسنجهّز طلبك خلال دقائق.</p>
              </div>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("مرحبًا، أريد إرسال صورة الروشتة")}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-lg transition hover:scale-[1.02]"
            >
              فتح واتساب <ChevronLeft className="size-4" />
            </a>
          </div>
        </section>

        {/* ── Products ────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title={activeCat === "all" ? "أحدث العروض" : categories.find((c) => c.id === activeCat)?.name ?? ""}
            subtitle={`${visible.length} منتج متاح`}
            action={
              <button className="text-sm font-bold text-primary hover:underline">
                عرض الكل
              </button>
            }
          />

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
              لا توجد نتائج مطابقة
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={() => setCartCount((c) => c + 1)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="brand-gradient grid size-11 place-items-center rounded-2xl overflow-hidden">
                <img src={logoAsset.url} alt="" className="size-9 object-contain" />
              </div>
              <div>
                <p className="font-black text-primary-deep">صيدلية المصلي</p>
                <p className="text-[11px] text-muted-foreground">إحدى شركات دهسم</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              صحتك أمانة. نوفّر لك أفضل المنتجات الطبية والعناية الشخصية بجودة مضمونة وأسعار منافسة.
            </p>
          </div>

          <FooterCol title="روابط سريعة" links={["الرئيسية", "العروض", "الفئات", "تتبع الطلب", "من نحن"]} />
          <FooterCol title="خدمة العملاء" links={["سياسة الإرجاع", "الشحن والتوصيل", "الأسئلة الشائعة", "اتصل بنا"]} />

          <div>
            <p className="font-black mb-3">تواصل معنا</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Phone className="size-4 text-primary" /> 779 301 162</li>
              <li className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> صنعاء — اليمن</li>
              <li className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /> يومياً 8 ص — 12 م</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} صيدلية المصلي. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
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

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-elevated">
      <div className="relative aspect-square overflow-hidden bg-secondary/60">
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition duration-500 group-hover:scale-110"
        />
        {product.badge && (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black text-destructive-foreground shadow">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{product.name}</h3>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-black text-primary-deep">{formatPrice(product.price)} <span className="text-xs font-bold">ر.ي</span></p>
            {product.oldPrice && (
              <p className="text-xs font-bold text-muted-foreground line-through">{formatPrice(product.oldPrice)}</p>
            )}
          </div>
          <button
            onClick={onAdd}
            aria-label="أضف إلى السلة"
            className="brand-gradient grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-card transition active:scale-90"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="font-black mb-3">{title}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="transition hover:text-primary">{l}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
