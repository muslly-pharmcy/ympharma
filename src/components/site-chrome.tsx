import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, MapPin, Menu, Phone, Truck, Clock3, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import logoAsset from "@/assets/almusalli-logo.asset.json";
import { categories } from "@/lib/products";

export function SiteHeader({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  const { count } = useCart();
  const { lang, setLang, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

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
          <div className="flex items-center gap-3 opacity-95">
            <Link to="/track" className="hover:underline">{t("topbar.track")}</Link>
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
            <div className={`brand-gradient grid place-items-center rounded-2xl shadow-card overflow-hidden ring-1 ring-white/30 transition-all duration-300 ${scrolled ? "size-9" : "size-12"}`}>
              <img src={logoAsset.url} alt={t("brand.name")} width="40" height="40" decoding="async" className="size-full object-contain p-1" />
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
              placeholder={t("search.placeholder")}
              className={`w-full rounded-2xl border border-border bg-secondary/60 ps-4 pe-11 text-sm font-medium outline-none transition-all duration-300 focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15 ${scrolled ? "py-2" : "py-3"}`}
            />
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
            <button className="md:hidden grid size-11 place-items-center rounded-2xl bg-secondary" aria-label={t("nav.menu")}><Menu className="size-5" /></button>
          </div>
        </div>

        <nav className={`border-t border-border bg-card transition-all duration-300 ${scrolled ? "max-h-0 overflow-hidden border-t-0" : "max-h-20"}`}>
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-2 text-sm font-bold">
            <Link to="/" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }} activeOptions={{ exact: true }}>{t("nav.home")}</Link>
            <Link to="/products" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>{t("nav.products")}</Link>
            {categories.map((c) => (
              <Link key={c.id} to="/products" search={{ cat: c.id }} className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground transition hover:text-primary">
                {c.name}
              </Link>
            ))}
            <Link to="/prescription" className="whitespace-nowrap rounded-xl px-4 py-2 text-emerald-700 hover:underline">{t("nav.prescription")}</Link>
            <Link to="/track" className="whitespace-nowrap rounded-xl px-4 py-2 text-primary hover:underline">{t("nav.track")}</Link>
          </div>
        </nav>
      </header>
    </>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="brand-gradient grid size-11 place-items-center rounded-2xl overflow-hidden">
              <img src={logoAsset.url} alt="" width="36" height="36" loading="lazy" decoding="async" className="size-9 object-contain" />
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
            <li className="flex items-center gap-2"><Phone className="size-4 text-primary" /> +967 782 878 280</li>
            <li>
              <a href="https://maps.app.goo.gl/ZK1a6kAGn1KdUgSF9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                <MapPin className="size-4 text-primary" /> {t("brand.tagline")}
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
