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

export type Category = { id: string; name: string };

export const categories: Category[] = [
  { id: "medicine", name: "الأدوية" },
  { id: "kids", name: "الأم والطفل" },
  { id: "devices", name: "أجهزة طبية" },
  { id: "cosmetics", name: "العناية والتجميل" },
  { id: "vitamins", name: "فيتامينات ومكملات" },
  { id: "now", name: "منتجات NOW Foods" },
  { id: "herbal", name: "أعشاب طبيعية" },
];

// ---------- Image pools (Unsplash) ----------
const IMG = {
  pill: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
  bottle: "https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=500",
  softgel: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=500",
  fishoil: "https://images.unsplash.com/photo-1559757175-08f0cd8e07d4?w=500",
  caps: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=500",
  baby: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500",
  babyCare: "https://images.unsplash.com/photo-1607000-2-25a1ed8c30c5?w=500",
  cream: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500",
  serum: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500",
  shampoo: "https://images.unsplash.com/photo-1626015449431-9385c0afea90?w=500",
  lipstick: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500",
  perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500",
  sunscreen: "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=500",
  device: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500",
  thermo: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500",
  herb: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500",
};

// ---------- Core medicine + devices ----------
const core: Product[] = [
  { id: 1, name: "بانادول إكسترا 24 قرص", brand: "Panadol", price: 1850, oldPrice: 2400, cat: "medicine", img: IMG.pill, badge: "خصم 22%" },
  { id: 3, name: "جهاز قياس ضغط الدم رقمي", brand: "Omron", price: 28500, oldPrice: 33000, cat: "devices", img: IMG.device, badge: "جديد" },
  { id: 5, name: "ميزان حرارة رقمي", brand: "Beurer", price: 4200, oldPrice: 5000, cat: "devices", img: IMG.thermo },
  { id: 7, name: "زيت حبة البركة العضوي", brand: "Natural", price: 2900, cat: "herbal", img: IMG.herb },
  { id: 8, name: "زيت زيتون بكر ممتاز 500مل", brand: "Natural", price: 4500, cat: "herbal", img: IMG.herb },
  { id: 9, name: "عسل سدر يمني أصلي 1كغ", brand: "Local", price: 18500, oldPrice: 22000, cat: "herbal", img: IMG.herb, badge: "محلي" },
  { id: 10, name: "كركم عضوي مطحون 250غ", brand: "Natural", price: 1800, cat: "herbal", img: IMG.herb },
  { id: 11, name: "جهاز قياس السكر Accu-Chek", brand: "Accu-Chek", price: 32000, cat: "devices", img: IMG.device },
  { id: 12, name: "كمامات طبية 50 قطعة", brand: "MediCare", price: 2400, cat: "devices", img: IMG.device },
];

// ---------- Kids: Johnson's + Himalaya ----------
let kidId = 200;
const k = (name: string, brand: string, price: number, oldPrice?: number, img = IMG.baby, badge?: string): Product => ({
  id: kidId++, name, brand, price, oldPrice, cat: "kids", img, badge,
});
const kids: Product[] = [
  // Johnson's Baby
  k("جونسون شامبو الأطفال 500مل", "Johnson's", 3200, 3800, IMG.shampoo, "جونسون"),
  k("جونسون غسول الأطفال No More Tears 300مل", "Johnson's", 2600, undefined, IMG.shampoo, "جونسون"),
  k("جونسون زيت الأطفال 300مل", "Johnson's", 2900, 3400, IMG.cream, "جونسون"),
  k("جونسون لوشن مرطب للأطفال 500مل", "Johnson's", 3400, undefined, IMG.cream, "جونسون"),
  k("جونسون بودرة الأطفال 200غ", "Johnson's", 1900, undefined, IMG.cream, "جونسون"),
  k("جونسون كريم وقاية تسلخات الحفاض 100غ", "Johnson's", 3100, 3600, IMG.cream, "جونسون"),
  k("جونسون مناديل مبللة 64 قطعة", "Johnson's", 2200, undefined, IMG.cream, "جونسون"),
  k("جونسون صابون الأطفال الأصلي 100غ", "Johnson's", 850, undefined, IMG.cream, "جونسون"),
  k("جونسون شامبو ولوشن قبل النوم 300مل", "Johnson's", 3300, undefined, IMG.shampoo, "جونسون"),
  k("جونسون مجموعة العناية الكاملة (6 قطع)", "Johnson's", 12500, 14500, IMG.cream, "جونسون"),
  k("جونسون كولونيا أطفال 100مل", "Johnson's", 2400, undefined, IMG.perfume, "جونسون"),
  k("جونسون كريم وجه مرطب للأطفال 100غ", "Johnson's", 2800, undefined, IMG.cream, "جونسون"),
  // Himalaya Baby
  k("هيمالايا شامبو الأطفال خفيف 400مل", "Himalaya", 2700, 3100, IMG.shampoo, "هيمالايا"),
  k("هيمالايا غسول الأطفال بالحليب والعسل 400مل", "Himalaya", 2500, undefined, IMG.shampoo, "هيمالايا"),
  k("هيمالايا زيت تدليك الأطفال 200مل", "Himalaya", 2900, undefined, IMG.cream, "هيمالايا"),
  k("هيمالايا لوشن مرطب للأطفال 200مل", "Himalaya", 2400, undefined, IMG.cream, "هيمالايا"),
  k("هيمالايا كريم الحفاض المهدئ 50غ", "Himalaya", 1800, 2200, IMG.cream, "هيمالايا"),
  k("هيمالايا صابون أطفال بزبدة الشيا 75غ", "Himalaya", 650, undefined, IMG.cream, "هيمالايا"),
  k("هيمالايا بودرة الأطفال 100غ", "Himalaya", 1500, undefined, IMG.cream, "هيمالايا"),
  k("هيمالايا كريم وجه للأطفال 50غ", "Himalaya", 1900, undefined, IMG.cream, "هيمالايا"),
  k("هيمالايا مناديل مبللة للأطفال 56 قطعة", "Himalaya", 1700, undefined, IMG.cream, "هيمالايا"),
  k("هيمالايا شراب طارد للغازات للأطفال", "Himalaya", 2300, undefined, IMG.bottle, "هيمالايا"),
  k("هيمالايا قطرة فيتامين د للأطفال", "Himalaya", 3100, undefined, IMG.bottle, "هيمالايا"),
  k("هيمالايا مجموعة العناية بالطفل (5 قطع)", "Himalaya", 9500, 11000, IMG.cream, "هيمالايا"),
  // Milk
  { id: 280, name: "حليب أطفال S-26 مرحلة 1 — 900غ", brand: "S-26", price: 9200, oldPrice: 10500, cat: "kids", img: IMG.baby, badge: "الأكثر مبيعاً" },
  { id: 281, name: "حليب أطفال Nan Optipro مرحلة 2 — 800غ", brand: "Nestlé", price: 8900, cat: "kids", img: IMG.baby },
  { id: 282, name: "حليب أطفال Aptamil مرحلة 1 — 800غ", brand: "Aptamil", price: 10500, cat: "kids", img: IMG.baby },
  { id: 283, name: "حفاضات Pampers مقاس 4 — 60 قطعة", brand: "Pampers", price: 7800, oldPrice: 8900, cat: "kids", img: IMG.baby },
];

// ---------- Cosmetics / Beauty ----------
let cosId = 400;
const c = (name: string, brand: string, price: number, oldPrice?: number, img = IMG.cream, badge?: string): Product => ({
  id: cosId++, name, brand, price, oldPrice, cat: "cosmetics", img, badge,
});
const cosmetics: Product[] = [
  c("كريم نيفيا للترطيب 200مل", "Nivea", 3400, undefined, IMG.cream),
  c("نيفيا روزة لتفتيح البشرة 100مل", "Nivea", 2900, 3400, IMG.cream),
  c("لوريال سيروم فيتامين سي مركز 30مل", "L'Oréal", 12500, 14500, IMG.serum, "الأفضل"),
  c("لوريال كريم Revitalift مكافح التجاعيد 50مل", "L'Oréal", 9800, undefined, IMG.cream),
  c("لوريال ماسكرا تكثيف الرموش", "L'Oréal", 5400, undefined, IMG.lipstick),
  c("ميبيلين أحمر شفاه Super Stay مات", "Maybelline", 3900, 4500, IMG.lipstick, "ترند"),
  c("ميبيلين ماسكرا Lash Sensational", "Maybelline", 4800, undefined, IMG.lipstick),
  c("ميبيلين كريم أساس Fit Me 30مل", "Maybelline", 5200, undefined, IMG.cream),
  c("غارنييه ميسيلار ماء منظف 400مل", "Garnier", 2800, undefined, IMG.serum),
  c("غارنييه ماسك ورقي مرطب بفيتامين C", "Garnier", 750, undefined, IMG.serum),
  c("نيوتروجينا غسول للوجه عميق التنظيف 200مل", "Neutrogena", 3800, undefined, IMG.shampoo),
  c("نيوتروجينا واقي شمس SPF 60 — 88مل", "Neutrogena", 6500, 7500, IMG.sunscreen, "حماية عالية"),
  c("نيوتروجينا كريم Hydro Boost المائي 50مل", "Neutrogena", 7900, undefined, IMG.cream),
  c("سيتافيل غسول لطيف للبشرة الحساسة 500مل", "Cetaphil", 6900, undefined, IMG.shampoo, "للحساسة"),
  c("سيتافيل لوشن مرطب 500مل", "Cetaphil", 7800, 8900, IMG.cream),
  c("لاروش بوزيه واقي شمس Anthelios SPF50", "La Roche-Posay", 12800, undefined, IMG.sunscreen),
  c("لاروش بوزيه Effaclar Duo+ للبشرة الدهنية 40مل", "La Roche-Posay", 11500, undefined, IMG.cream),
  c("فيشي مينرال 89 سيروم 50مل", "Vichy", 13500, 15500, IMG.serum),
  c("بايودرما سينسبيو غسول ميسيلار 500مل", "Bioderma", 8400, undefined, IMG.serum, "موصى به"),
  c("شامبو سيباميد للشعر الدهني 200مل", "Sebamed", 6800, undefined, IMG.shampoo),
  c("بانتين شامبو 3 في 1 — 600مل", "Pantene", 3900, 4400, IMG.shampoo),
  c("هيد آند شولدرز شامبو ضد القشرة 600مل", "Head & Shoulders", 3700, undefined, IMG.shampoo),
  c("دوف بار صابون مرطب 4×100غ", "Dove", 2900, undefined, IMG.cream),
  c("عطر فيكتوريا سيكريت Bombshell EDP 100مل", "Victoria's Secret", 38500, 45000, IMG.perfume, "فاخر"),
  c("عطر Dior Sauvage للرجال EDP 100مل", "Dior", 68500, 78000, IMG.perfume, "فاخر"),
  c("بياض الأسنان كولجيت 3D Whitening", "Colgate", 2400, undefined, IMG.cream),
  c("فرشاة أسنان كهربائية Oral-B", "Oral-B", 18500, 22000, IMG.device),
];

// ---------- Vitamins: 100 SKUs across many brands ----------
const vitaminBrands = [
  "NOW Foods", "Solgar", "Nature's Bounty", "GNC", "Centrum", "21st Century",
  "Puritan's Pride", "Doctor's Best", "Jarrow Formulas", "Swanson",
  "Nordic Naturals", "Garden of Life", "Kirkland", "Bayer", "MegaFood",
];
const vitaminTypes: { n: string; lo: number; hi: number; img: string; tag?: string }[] = [
  { n: "فيتامين C 1000mg", lo: 60, hi: 200, img: IMG.bottle, tag: "مناعة" },
  { n: "فيتامين D3 5000 IU", lo: 60, hi: 240, img: IMG.softgel, tag: "عظام" },
  { n: "فيتامين B12 1000mcg", lo: 60, hi: 200, img: IMG.bottle, tag: "طاقة" },
  { n: "فيتامين B Complex", lo: 60, hi: 180, img: IMG.bottle },
  { n: "فيتامين E 400 IU", lo: 60, hi: 180, img: IMG.softgel, tag: "بشرة" },
  { n: "فيتامين A 10,000 IU", lo: 60, hi: 180, img: IMG.softgel },
  { n: "فيتامين K2 MK-7 100mcg", lo: 60, hi: 120, img: IMG.caps },
  { n: "ملتي فيتامين يومي", lo: 60, hi: 250, img: IMG.bottle, tag: "شامل" },
  { n: "أوميغا 3 1000mg", lo: 90, hi: 240, img: IMG.fishoil, tag: "قلب" },
  { n: "كولاجين بحري 1000mg", lo: 90, hi: 180, img: IMG.caps, tag: "بشرة" },
  { n: "بيوتين 10,000mcg", lo: 60, hi: 120, img: IMG.bottle, tag: "شعر" },
  { n: "زنك 50mg", lo: 60, hi: 200, img: IMG.caps },
  { n: "حديد 18mg", lo: 60, hi: 180, img: IMG.caps },
  { n: "كالسيوم + فيتامين D 600mg", lo: 60, hi: 200, img: IMG.bottle },
  { n: "مغنيسيوم سترات 400mg", lo: 60, hi: 240, img: IMG.bottle },
  { n: "بروبيوتيك 25 مليار", lo: 60, hi: 100, img: IMG.caps, tag: "هضم" },
  { n: "كركم وكركمين 750mg", lo: 60, hi: 180, img: IMG.caps },
  { n: "كوكيو 10 (CoQ10) 200mg", lo: 60, hi: 200, img: IMG.softgel },
  { n: "أشواغاندا 500mg", lo: 60, hi: 120, img: IMG.caps },
  { n: "جنكة بيلوبا 120mg", lo: 60, hi: 180, img: IMG.caps },
];
const sizes = ["60 قرص", "90 قرص", "120 كبسولة", "180 كبسولة", "240 سوفت جل", "100 قرص"];

const vitamins: Product[] = [];
let vid = 1000;
let salt = 7;
for (let i = 0; i < 100; i++) {
  const t = vitaminTypes[i % vitaminTypes.length];
  const b = vitaminBrands[(i * 3 + 1) % vitaminBrands.length];
  const size = sizes[(i + salt) % sizes.length];
  const price = t.lo * 100 + ((i * 137 + 41) % ((t.hi - t.lo) * 100));
  const discount = i % 4 === 0;
  vitamins.push({
    id: vid++,
    name: `${t.n} — ${size}`,
    brand: b,
    price,
    oldPrice: discount ? Math.round(price * 1.18) : undefined,
    cat: "vitamins",
    img: t.img,
    badge: t.tag,
    desc: `منتج ${b} الأصلي.`,
  });
  salt = (salt + 13) % 17;
}

// Keep existing NOW Foods section as separately tagged products too
const now: Product[] = [
  { id: 101, name: "NOW فيتامين C 1000mg — 100 قرص", brand: "NOW Foods", price: 8500, oldPrice: 9800, cat: "now", img: IMG.bottle, badge: "NOW" },
  { id: 102, name: "NOW فيتامين D3 5000 IU — 240 سوفت جل", brand: "NOW Foods", price: 7200, cat: "now", img: IMG.softgel, badge: "NOW" },
  { id: 103, name: "NOW أوميغا 3 1000mg — 200 سوفت جل", brand: "NOW Foods", price: 11500, oldPrice: 13000, cat: "now", img: IMG.fishoil, badge: "NOW" },
  { id: 104, name: "NOW زنك بيكولينات 50mg — 120 كبسولة", brand: "NOW Foods", price: 5800, cat: "now", img: IMG.caps, badge: "NOW" },
  { id: 105, name: "NOW مغنيسيوم سترات 200mg — 250 قرص", brand: "NOW Foods", price: 6900, cat: "now", img: IMG.bottle, badge: "NOW" },
  { id: 106, name: "NOW بيوتين 10,000mcg — 120 كبسولة", brand: "NOW Foods", price: 7800, oldPrice: 8900, cat: "now", img: IMG.bottle, badge: "NOW" },
  { id: 107, name: "NOW ملتي فيتامين Daily Vits — 250 قرص", brand: "NOW Foods", price: 9400, cat: "now", img: IMG.softgel, badge: "NOW" },
  { id: 108, name: "NOW كولاجين بحري — 120 كبسولة", brand: "NOW Foods", price: 10200, cat: "now", img: IMG.caps, badge: "NOW" },
  { id: 109, name: "NOW بروبيوتيك 25 مليار — 50 كبسولة", brand: "NOW Foods", price: 12800, oldPrice: 14500, cat: "now", img: IMG.caps, badge: "NOW" },
  { id: 110, name: "NOW حديد 18mg — 120 كبسولة", brand: "NOW Foods", price: 5400, cat: "now", img: IMG.bottle, badge: "NOW" },
];

export const products: Product[] = [...core, ...kids, ...cosmetics, ...vitamins, ...now];

export function formatPrice(n: number) {
  return n.toLocaleString("ar-EG");
}

export function getProductById(id: number) {
  return products.find((p) => p.id === id);
}
