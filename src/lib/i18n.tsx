import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

export const dict: Dict = {
  "topbar.delivery": { ar: "توصيل سريع لجميع المحافظات", en: "Fast delivery across all governorates" },
  "topbar.track": { ar: "تتبع طلبك", en: "Track order" },
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.products": { ar: "كل المنتجات", en: "All products" },
  "nav.prescription": { ar: "📄 ارفع الروشتة", en: "📄 Upload prescription" },
  "nav.track": { ar: "تتبع الطلب", en: "Track order" },
  "nav.cart": { ar: "السلة", en: "Cart" },
  "nav.menu": { ar: "القائمة", en: "Menu" },
  "nav.branch": { ar: "عدن — المنصورة", en: "Aden — Al Mansoura" },
  "search.placeholder": { ar: "ابحث عن دواء، فيتامين، منتج عناية...", en: "Search medicines, vitamins, care products..." },
  "brand.name": { ar: "صيدلية المصلي", en: "Al Musalli Pharmacy" },
  "brand.tagline": { ar: "عدن — المنصورة", en: "Aden — Al Mansoura" },
  "hero.badge": { ar: "صحتك تهمنا، وطلبك يصل أسرع", en: "Your health matters, your order arrives faster" },
  "hero.title1": { ar: "كل احتياجاتك الطبية", en: "All your medical needs" },
  "hero.title2": { ar: "بين يديك خلال ساعة", en: "in your hands within an hour" },
  "hero.subtitle": { ar: "أكثر من 5,000 منتج طبي وفيتامينات أصلية، مع تجهيز آلي للطلب عبر واتساب وتوصيل موثوق داخل عدن ولجميع المحافظات.", en: "Over 5,000 medical products and authentic vitamins, with automated WhatsApp order processing and reliable delivery in Aden and all governorates." },
  "hero.shop": { ar: "تسوّق الآن", en: "Shop now" },
  "hero.prescription": { ar: "ارفع الروشتة عبر واتساب", en: "Upload prescription via WhatsApp" },
  "hero.tagline": { ar: "عنايتنا، ثقتكم", en: "Your Health, Our Commitment" },
  "track.title": { ar: "تتبع طلبك لحظة بلحظة", en: "Track your order in real time" },
  "track.subtitle": { ar: "أدخل رقم الطلب وتابع حالته من التجهيز حتى وصول المندوب.", en: "Enter your order ID to follow it from preparation to delivery." },
  "track.placeholder": { ar: "مثال: AM-XXXXXX", en: "e.g. AM-XXXXXX" },
  "track.button": { ar: "تتبع", en: "Track" },
  "footer.about": { ar: "صحتك أمانة. نوفّر لك أفضل المنتجات الطبية بجودة مضمونة وأسعار منافسة.", en: "Your health is our trust. We provide the best medical products with guaranteed quality and competitive prices." },
  "footer.quick": { ar: "روابط سريعة", en: "Quick links" },
  "footer.support": { ar: "خدمة العملاء", en: "Customer service" },
  "footer.contact": { ar: "تواصل معنا", en: "Contact us" },
  "footer.returns": { ar: "سياسة الإرجاع", en: "Return policy" },
  "footer.shipping": { ar: "الشحن والتوصيل", en: "Shipping & delivery" },
  "footer.faq": { ar: "الأسئلة الشائعة", en: "FAQ" },
  "footer.hours": { ar: "يومياً 8 ص — 12 م", en: "Daily 8 AM — 12 AM" },
  "footer.rights": { ar: "جميع الحقوق محفوظة", en: "All rights reserved" },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string }>({
  lang: "ar",
  setLang: () => {},
  t: (k) => dict[k]?.ar ?? String(k),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang") as Lang | null;
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };

  const t = (k: keyof typeof dict) => dict[k]?.[lang] ?? String(k);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
