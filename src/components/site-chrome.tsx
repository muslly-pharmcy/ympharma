import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, MapPin, Menu, Phone, Truck, Clock3 } from "lucide-react";
import { useCart } from "@/lib/cart";
import logoAsset from "@/assets/almusalli-logo.asset.json";
import { categories } from "@/lib/products";

export function SiteHeader({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  const { count } = useCart();
  return (
    <>
      <div className="brand-gradient text-primary-foreground text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 sm:flex"><Truck className="size-3.5" /> توصيل سريع لجميع المحافظات</span>
            <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> 782 878 280</span>
          </div>
          <div className="flex items-center gap-4 opacity-90">
            <Link to="/track" className="hover:underline">تتبع طلبك</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="brand-gradient grid size-12 place-items-center rounded-2xl shadow-card overflow-hidden ring-1 ring-white/30">
              <img src={logoAsset.url} alt="صيدلية المصلي" width="40" height="40" decoding="async" className="size-10 object-contain" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <span className="block truncate text-lg font-black leading-none text-primary-deep">صيدلية المصلي</span>
              <span className="text-[11px] font-bold text-muted-foreground">عدن — المنصورة</span>
            </div>
          </Link>

          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search ?? ""}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="ابحث عن دواء، فيتامين، منتج عناية..."
              className="w-full rounded-2xl border border-border bg-secondary/60 py-3 pr-11 pl-4 text-sm font-medium outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="hidden md:flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground transition hover:bg-accent">
              <MapPin className="size-4 text-primary" />
              <span className="hidden lg:inline">عدن — المنصورة</span>
            </button>
            <Link to="/cart" className="relative grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition hover:bg-accent" aria-label="السلة">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground animate-in zoom-in">
                  {count}
                </span>
              )}
            </Link>
            <button className="md:hidden grid size-11 place-items-center rounded-2xl bg-secondary" aria-label="القائمة"><Menu className="size-5" /></button>
          </div>
        </div>

        <nav className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-2 text-sm font-bold">
            <Link to="/" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }} activeOptions={{ exact: true }}>الرئيسية</Link>
            <Link to="/products" className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground hover:text-primary" activeProps={{ className: "brand-gradient text-primary-foreground shadow-card" }}>كل المنتجات</Link>
            {categories.map((c) => (
              <Link key={c.id} to="/products" search={{ cat: c.id }} className="whitespace-nowrap rounded-xl px-4 py-2 text-muted-foreground hover:text-primary">
                {c.name}
              </Link>
            ))}
            <Link to="/prescription" className="whitespace-nowrap rounded-xl px-4 py-2 text-emerald-700 hover:underline">📄 ارفع الروشتة</Link>
            <Link to="/track" className="whitespace-nowrap rounded-xl px-4 py-2 text-primary hover:underline">تتبع الطلب</Link>
          </div>
        </nav>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="brand-gradient grid size-11 place-items-center rounded-2xl overflow-hidden">
              <img src={logoAsset.url} alt="" width="36" height="36" loading="lazy" decoding="async" className="size-9 object-contain" />
            </div>
            <div>
              <p className="font-black text-primary-deep">صيدلية المصلي</p>
              <p className="text-[11px] text-muted-foreground">عدن — المنصورة</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">صحتك أمانة. نوفّر لك أفضل المنتجات الطبية بجودة مضمونة وأسعار منافسة.</p>
        </div>
        <div>
          <p className="font-black mb-3">روابط سريعة</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary">الرئيسية</Link></li>
            <li><Link to="/products" className="hover:text-primary">المنتجات</Link></li>
            <li><Link to="/cart" className="hover:text-primary">السلة</Link></li>
            <li><Link to="/track" className="hover:text-primary">تتبع الطلب</Link></li>
            <li><Link to="/prescription" className="hover:text-primary">ارفع الروشتة</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-black mb-3">خدمة العملاء</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>سياسة الإرجاع</li><li>الشحن والتوصيل</li><li>الأسئلة الشائعة</li>
          </ul>
        </div>
        <div>
          <p className="font-black mb-3">تواصل معنا</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="size-4 text-primary" /> +967 782 878 280</li>
            <li>
              <a href="https://maps.app.goo.gl/ZK1a6kAGn1KdUgSF9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                <MapPin className="size-4 text-primary" /> عدن — المنصورة، اليمن (الموقع على الخرائط)
              </a>
            </li>
            <li className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /> يومياً 8 ص — 12 م</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} صيدلية المصلي. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}
