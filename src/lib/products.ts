export type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  oldPrice?: number;
  cat: string;
  img: string;
  badge?: string;
  desc?: string;
};

export type Category = {
  id: string;
  name: string;
};

export const categories: Category[] = [
  { id: "medicine", name: "الأدوية" },
  { id: "kids", name: "الأم والطفل" },
  { id: "devices", name: "أجهزة طبية" },
  { id: "cosmetics", name: "العناية والتجميل" },
  { id: "vitamins", name: "فيتامينات ومكملات" },
  { id: "now", name: "منتجات NOW Foods" },
  { id: "herbal", name: "أعشاب طبيعية" },
];

export const products: Product[] = [
  { id: 1, name: "بانادول إكسترا 24 قرص", brand: "Panadol", price: 1850, oldPrice: 2400, cat: "medicine", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500", badge: "خصم 22%" },
  { id: 2, name: "حليب أطفال S-26 مرحلة 1", brand: "S-26", price: 9200, oldPrice: 10500, cat: "kids", img: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500", badge: "الأكثر مبيعاً" },
  { id: 3, name: "جهاز قياس ضغط الدم رقمي", brand: "Omron", price: 28500, oldPrice: 33000, cat: "devices", img: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500", badge: "جديد" },
  { id: 4, name: "كريم نيفيا للترطيب 200مل", brand: "Nivea", price: 3400, cat: "cosmetics", img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500" },
  { id: 5, name: "ميزان حرارة رقمي", brand: "Beurer", price: 4200, oldPrice: 5000, cat: "devices", img: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500" },
  { id: 6, name: "شامبو سيباميد للشعر الدهني", brand: "Sebamed", price: 6800, cat: "cosmetics", img: "https://images.unsplash.com/photo-1626015449431-9385c0afea90?w=500", badge: "موصى به" },
  { id: 7, name: "زيت حبة البركة العضوي", brand: "Natural", price: 2900, cat: "herbal", img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500" },

  // NOW Foods vitamins
  { id: 101, name: "فيتامين C 1000mg — 100 قرص", brand: "NOW Foods", price: 8500, oldPrice: 9800, cat: "now", img: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=500", badge: "NOW", desc: "مضاد أكسدة قوي يدعم المناعة." },
  { id: 102, name: "فيتامين D3 5000 IU — 240 سوفت جل", brand: "NOW Foods", price: 7200, cat: "now", img: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=500", badge: "NOW", desc: "لصحة العظام والمناعة." },
  { id: 103, name: "أوميغا 3 1000mg — 200 سوفت جل", brand: "NOW Foods", price: 11500, oldPrice: 13000, cat: "now", img: "https://images.unsplash.com/photo-1559757175-08f0cd8e07d4?w=500", badge: "NOW", desc: "زيت سمك نقي لصحة القلب والدماغ." },
  { id: 104, name: "زنك بيكولينات 50mg — 120 كبسولة", brand: "NOW Foods", price: 5800, cat: "now", img: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=500", badge: "NOW" },
  { id: 105, name: "مغنيسيوم سترات 200mg — 250 قرص", brand: "NOW Foods", price: 6900, cat: "now", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500", badge: "NOW" },
  { id: 106, name: "بيوتين 10,000mcg — 120 كبسولة", brand: "NOW Foods", price: 7800, oldPrice: 8900, cat: "now", img: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=500", badge: "NOW", desc: "لصحة الشعر والأظافر والبشرة." },
  { id: 107, name: "ملتي فيتامين Daily Vits — 250 قرص", brand: "NOW Foods", price: 9400, cat: "now", img: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=500", badge: "NOW" },
  { id: 108, name: "كولاجين بحري — 120 كبسولة", brand: "NOW Foods", price: 10200, cat: "now", img: "https://images.unsplash.com/photo-1559757175-08f0cd8e07d4?w=500", badge: "NOW", desc: "يدعم نضارة البشرة والمفاصل." },
  { id: 109, name: "بروبيوتيك 25 مليار — 50 كبسولة", brand: "NOW Foods", price: 12800, oldPrice: 14500, cat: "now", img: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=500", badge: "NOW" },
  { id: 110, name: "حديد 18mg — 120 كبسولة", brand: "NOW Foods", price: 5400, cat: "now", img: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=500", badge: "NOW" },
];

export function formatPrice(n: number) {
  return n.toLocaleString("ar-EG");
}

export function getProductById(id: number) {
  return products.find((p) => p.id === id);
}
