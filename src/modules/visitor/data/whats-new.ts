export type WhatsNewItem = {
  id: string;
  title: string;
  summary: string;
  tag: "جديد" | "تحديث" | "مقال" | "خدمة";
  date: string; // YYYY-MM-DD
  href: string;
};

export const whatsNew: WhatsNewItem[] = [
  {
    id: "doctors-directory",
    title: "دليل الأطباء المعتمدين في عدن",
    summary: "ابحث عن أطباء موثّقين حسب التخصص والمنطقة، مع درجات ثقة واضحة.",
    tag: "جديد",
    date: "2026-07-10",
    href: "/doctors",
  },
  {
    id: "sahtak-launch",
    title: "قسم «صحتك» — محتوى صحي موثوق",
    summary: "مقالات مبسّطة يعدها صيادلة وأطباء لدعم قراراتك اليومية.",
    tag: "خدمة",
    date: "2026-07-08",
    href: "/sahtak",
  },
  {
    id: "prescription-upload",
    title: "رفع الروشتة أصبح أسرع",
    summary: "صوّر الروشتة من الجوال وسنعاود التواصل معك خلال دقائق.",
    tag: "تحديث",
    date: "2026-07-01",
    href: "/prescription",
  },
  {
    id: "delivery-24-7",
    title: "خدمة الطلب 24/7",
    summary: "استقبال الطلبات على مدار الساعة داخل عدن ولكل المحافظات.",
    tag: "خدمة",
    date: "2026-06-20",
    href: "/products",
  },
];
