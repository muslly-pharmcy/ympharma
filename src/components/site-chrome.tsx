import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, MapPin, Menu, Phone, Truck, Clock3, Globe, Shield, Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { useSpeech } from "@/hooks/use-speech";
import logoUrl from "@/assets/almusalli-logo.webp";
import { categories } from "@/lib/products";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  const navigate = useNavigate();
  const { isSupported, isListening, error: voiceError, start, stop } = useSpeech("ar-SA");

  const handleVoiceResult = (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (onSearch) onSearch(t);
    else navigate({ to: "/products", search: { q: t } });
  };

  const handleSubmitSearch = (e: React.FormEvent<HTMLInputElement>) => {
    if ((e as any).key !== "Enter") return;
    const v = (e.target as HTMLInputElement).value.trim();
    if (!v) return;
    if (!onSearch) navigate({ to: "/products", search: { q: v } });
  };

  const { count } = useCart();
  const { lang, setLang, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="brand-gradient text-primary-foreground text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 sm:flex"><Truck className="size-3.5" /> {t("topbar.delivery")}</span>
            <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> 782 878 280</span>
          </div>
          <div className="flex items-center gap-2 opacity-95">
            <Link to="/track" className="hover:underline">{t("topbar.track")}</Link>
            <ThemeToggle />
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 font-bold ring-1 ring-white/25 transition hover:bg-white/25"
              aria-label="Switch language"
            >
              <Globe className="size-3.5" /> {lang === "ar" ? "EN" : "ع"}
            </button>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out ${
          scrolled ? "shadow-card" : ""
        }`}
      >
        <div className={`mx-auto flex max-w-7xl items-center gap-4 px-4 transition-all duration-300 ease-in-out ${scrolled ? "py-1.5" : "py-3"}`}>
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className={`grid place-items-center rounded-2xl bg-white shadow-card overflow-hidden ring-1 ring-border transition-all duration-300 ${scrolled ? "size-9" : "size-12"}`}>
              <img src={logoUrl} alt={t("brand.name")} width="40" height="40" decoding="async" fetchPriority="high" className="size-full object-contain p-0.5" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <span className={`block truncate font-black leading-none text-primary-deep transition-all ${scrolled ? "text-base" : "text-lg"}`}>{t("brand.name")}</span>
              {!scrolled && <span className="text-[11px] font-bold text-muted-foreground">{t("brand.tagline")}</span>}
            </div>
          </Link>

          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute end-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search ?? ""}
              onChange={(e) => onSearch?.(e.target.value)}
              onKeyDown={handleSubmitSearch}
              placeholder={isListening ? "🎤 جارٍ الاستماع..." : t("search.placeholder")}
              className={`w-full rounded-2xl border border-border bg-secondary/60 ps-4 pe-20 text-sm font-medium outline-none transition-all duration-300 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15 ${scrolled ? "py-2" : "py-3"} ${isListening ? "ring-2 ring-red-400/60" : ""}`}
              aria-label={t("search.placeholder")}
            />
            {isSupported && (
              <button
                type="button"
                onClick={() => (isListening ? stop() : start(handleVoiceResult))}
                aria-label={isListening ? "إيقاف البحث الصوتي" : "بدء البحث الصوتي"}
                aria-pressed={isListening}
                title={voiceError ? `خطأ: ${voiceError}` : isListening ? "إيقاف" : "بحث صوتي"}
                className={`absolute end-10 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full transition ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-secondary text-primary hover:bg-accent"}`}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            )}
          </div>


          <div className="flex items-center gap-2 shrink-0">
            <button className="hidden md:flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground transition hover:bg-accent">
              <MapPin className="size-4 text-primary" />
              <span className="hidden lg:inline">{t("nav.branch")}</span>
            </button>
            <Link to="/cart" className="relative grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition hover:bg-accent hover:scale-105" aria-label={t("nav.cart")}>
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground animate-in zoom-in">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              aria-haspopup="menu"
              className="md:hidden grid size-11 place-items-center rounded-2xl bg-secondary transition hover:bg-accent"
              aria-label={mobileOpen ? t("nav.close") ?? "إغلاق القائمة" : t("nav.menu")}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        <nav
          id="site-mobile-nav"
          role="navigation"
          aria-label="Main"
          data-state={mobileOpen ? "open" : "closed"}
          className={`border-t border-border bg-card transition-all duration-300 overflow-hidden ${
            mobileOpen ? "max-h-[70vh]" : "max-h-0 md:max-h-20 md:border-t"
          }`}
        >
          <div
            className="mx-auto flex max-w-7xl flex-col items-stretch gap-1 px-2 py-2 text-sm font-bold md:flex-row md:items-center md:overflow-x-auto"
            onClick={() => setMobileOpen(false)}
          >
            <Link to="/" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }} activeOptions={{ exact: true }}>{t("nav.home")}</Link>
            <Link to="/products" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>🏪 الصيدليات</Link>
            <Link to="/prescription" className="whitespace-nowrap rounded-xl px-4 py-2 text-emerald-700 transition hover:underline" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>📋 {t("nav.prescription")}</Link>
            <Link to="/track" className="whitespace-nowrap rounded-xl px-4 py-2 text-primary transition hover:underline" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>{t("nav.track")}</Link>
            <Link to="/insurance" className="whitespace-nowrap rounded-xl px-4 py-2 font-black text-primary hover:underline" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>🩺 التأمين الطبي</Link>
            <Link to="/ai-assistant" className="whitespace-nowrap rounded-xl px-4 py-2 font-black text-primary hover:underline" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>🤖 استشارة دوائية</Link>
            <Link to="/trust" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>🛡️ الأمان والخصوصية</Link>
            <a href="#site-footer" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary md:hidden">✉️ تواصل معنا</a>
            <div className="hidden md:flex md:items-center md:gap-1 md:border-s md:border-border md:ps-2">
              {categories.map((c) => (
                <Link key={c.id} to="/products" search={{ cat: c.id }} className="whitespace-nowrap rounded-xl px-3 py-2 text-muted-foreground transition hover:text-primary">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer id="site-footer" className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white ring-1 ring-border overflow-hidden">
              <img src={logoUrl} alt="" width="36" height="36" loading="lazy" decoding="async" className="size-9 object-contain" />
            </div>
            <div>
              <p className="font-black text-primary-deep">{t("brand.name")}</p>
              <p className="text-[11px] text-muted-foreground">{t("brand.tagline")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("footer.about")}</p>
        </div>
        <div>
          <p className="font-black mb-3">{t("footer.quick")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary">{t("nav.home")}</Link></li>
            <li><Link to="/products" className="hover:text-primary">{t("nav.products")}</Link></li>
            <li><Link to="/cart" className="hover:text-primary">{t("nav.cart")}</Link></li>
            <li><Link to="/track" className="hover:text-primary">{t("nav.track")}</Link></li>
            <li><Link to="/prescription" className="hover:text-primary">{t("nav.prescription")}</Link></li>
            <li><Link to="/insurance" className="hover:text-primary">🩺 التأمين الطبي</Link></li>
            <li><Link to="/trust" className="inline-flex items-center gap-1 transition hover:text-primary" activeProps={{ className: "text-primary font-black" }}><Shield className="size-3.5" /> الأمان والخصوصية</Link></li>
            <li><Link to="/status" className="inline-flex items-center gap-1 transition hover:text-primary" activeProps={{ className: "text-primary font-black" }}>📡 حالة الخدمة</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-black mb-3">{t("footer.support")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t("footer.returns")}</li><li>{t("footer.shipping")}</li><li>{t("footer.faq")}</li>
          </ul>
        </div>
        <div>
          <p className="font-black mb-3">{t("footer.contact")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2" dir="ltr"><Phone className="size-4 text-primary" /> +967 782 878 280</li>
            <li className="flex items-center gap-2" dir="ltr"><Phone className="size-4 text-primary" /> +967 774 068 936</li>
            <li className="flex items-center gap-2" dir="ltr"><Phone className="size-4 text-primary" /> 02 358921</li>
            <li>
              <a href="https://maps.app.goo.gl/ZK1a6kAGn1KdUgSF9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                <MapPin className="size-4 text-primary" /> عدن — المنصورة — ريمي، أمام مستشفى صابر
              </a>
            </li>
            <li className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /> {t("footer.hours")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}.</p>
      </div>
    </footer>
  );
}
