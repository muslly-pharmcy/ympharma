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
  pillStrip: "https://images.unsplash.com/photo-1550572017-edd951b55104?w=500",
  pillsAmber: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500",
  syrup: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500",
  injection: "https://images.unsplash.com/photo-1583912267550-d44c9bdc4262?w=500",
  inhaler: "https://images.unsplash.com/photo-1632571401005-458e9d244591?w=500",
  ointment: "https://images.unsplash.com/photo-1631549919423-c7a4c4d3e87f?w=500",
  drops: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500",
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
  dermaSerum: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500",
  dermaCream: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=500",
  dermaTube: "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=500",
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

  // ===== شركة ديرما للتجميل Derma =====
  c("ديرما سيروم فيتامين C مركّز 30مل", "Derma", 4800, 5800, IMG.serum, "ديرما"),
  c("ديرما كريم تفتيح البشرة بالنياسيناميد 50مل", "Derma", 5200, 6200, IMG.cream, "ديرما"),
  c("ديرما واقي شمس SPF 50+ مات 50مل", "Derma", 4500, 5400, IMG.sunscreen, "ديرما"),
  c("ديرما غسول رغوي للبشرة الدهنية 200مل", "Derma", 2900, undefined, IMG.shampoo, "ديرما"),
  c("ديرما كريم ترطيب بحمض الهيالورونيك 50مل", "Derma", 5800, 6500, IMG.cream, "ديرما"),
  c("ديرما سيروم ريتينول للتجديد الليلي 30مل", "Derma", 6500, 7800, IMG.serum, "ديرما"),
  c("ديرما تونر منقّي للمسامات 200مل", "Derma", 3200, undefined, IMG.serum, "ديرما"),
  c("ديرما كريم حول العين مضاد للهالات 15مل", "Derma", 4200, undefined, IMG.cream, "ديرما"),
  c("ديرما ماسك الفحم لتنقية البشرة 100مل", "Derma", 2800, 3400, IMG.cream, "ديرما"),
  c("ديرما زيت الأرغان للشعر التالف 100مل", "Derma", 3900, undefined, IMG.bottle, "ديرما"),
  c("ديرما شامبو ضد تساقط الشعر 300مل", "Derma", 4400, 5200, IMG.shampoo, "ديرما"),
  c("ديرما كريم تشقق القدمين باليوريا 100غ", "Derma", 2400, undefined, IMG.cream, "ديرما"),
  c("ديرما أحمر شفاه مات طويل الثبات", "Derma", 2200, 2800, IMG.lipstick, "ديرما"),
  c("ديرما كحل العين الأسود المقاوم للماء", "Derma", 1800, undefined, IMG.lipstick, "ديرما"),
  c("ديرما عطر زهور الياسمين EDP 50مل", "Derma", 8500, 10500, IMG.perfume, "ديرما"),
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

// ---------- Medicines: Hikma + Novartis + YEPCA ----------
let medId = 3000;
const m = (
  name: string,
  brand: string,
  price: number,
  oldPrice?: number,
  desc?: string,
  img = IMG.pill,
  badge?: string,
): Product => ({ id: medId++, name, brand, price, oldPrice, cat: "medicine", img, badge, desc });

const meds: Product[] = [
  // ===== شركة الحكمة Hikma =====
  m("سيفترياكسون 1غ حقن (Hikma)", "Hikma", 1800, 2200, "مضاد حيوي واسع الطيف للحقن الوريدي/العضلي. يُستخدم لعلاج الالتهابات البكتيرية الشديدة.", IMG.bottle, "حكمة"),
  m("أموكسيسيلين 500mg — 21 كبسولة (Hikma)", "Hikma", 950, 1200, "مضاد حيوي من عائلة البنسلين لعلاج التهابات الأذن والحلق والجهاز التنفسي.", IMG.caps, "حكمة"),
  m("أوجمنتين شراب 156mg/5ml (Hikma)", "Hikma", 2200, undefined, "أموكسيسيلين + كلافولانات للأطفال — مضاد حيوي مركّب.", IMG.bottle, "حكمة"),
  m("سيبروفلوكساسين 500mg — 10 أقراص (Hikma)", "Hikma", 1400, 1700, "مضاد حيوي من مجموعة الكينولونات لعلاج التهابات المسالك البولية.", IMG.pill, "حكمة"),
  m("أزيثرومايسين 500mg — 3 أقراص (Hikma)", "Hikma", 1850, 2100, "مضاد حيوي ماكروليد لعلاج التهابات الجهاز التنفسي.", IMG.pill, "حكمة"),
  m("ميتفورمين 500mg — 30 قرص (Hikma)", "Hikma", 700, undefined, "خافض لسكر الدم لمرضى السكري النوع الثاني.", IMG.pill, "حكمة"),
  m("أوميبرازول 20mg — 14 كبسولة (Hikma)", "Hikma", 950, 1200, "مثبط لمضخة البروتون لعلاج قرحة المعدة والارتجاع.", IMG.caps, "حكمة"),
  m("ديكلوفيناك صوديوم 50mg — 20 قرص (Hikma)", "Hikma", 600, undefined, "مضاد التهاب غير ستيرويدي ومسكن للآلام.", IMG.pill, "حكمة"),
  m("باراسيتامول 500mg — 20 قرص (Hikma)", "Hikma", 350, 450, "مسكن وخافض للحرارة آمن للاستخدام اليومي.", IMG.pill, "حكمة"),
  m("سيتيريزين 10mg — 10 أقراص (Hikma)", "Hikma", 480, undefined, "مضاد هيستامين لعلاج الحساسية والرشح.", IMG.pill, "حكمة"),
  m("لوراتادين 10mg — 10 أقراص (Hikma)", "Hikma", 520, undefined, "مضاد حساسية لا يسبب النعاس.", IMG.pill, "حكمة"),
  m("سالبوتامول بخاخ 100mcg (Hikma)", "Hikma", 2400, 2900, "موسع للشعب الهوائية لمرضى الربو.", IMG.bottle, "حكمة"),
  m("بريدنيزولون 5mg — 20 قرص (Hikma)", "Hikma", 580, undefined, "ستيرويد لعلاج الالتهابات والحساسية الشديدة.", IMG.pill, "حكمة"),
  m("رانيتيدين 150mg — 20 قرص (Hikma)", "Hikma", 540, undefined, "خافض لحموضة المعدة.", IMG.pill, "حكمة"),
  m("ميترونيدازول 500mg — 20 قرص (Hikma)", "Hikma", 720, undefined, "مضاد للطفيليات والبكتيريا اللاهوائية.", IMG.pill, "حكمة"),
  m("كلاريثرومايسين 500mg — 14 قرص (Hikma)", "Hikma", 2100, undefined, "مضاد حيوي ماكروليد.", IMG.pill, "حكمة"),
  m("بيرافيرين شراب مضاد للسعال (Hikma)", "Hikma", 1100, undefined, "شراب مهدئ للسعال الجاف.", IMG.bottle, "حكمة"),
  m("كاربامازيبين 200mg — 30 قرص (Hikma)", "Hikma", 1300, undefined, "مضاد للصرع.", IMG.pill, "حكمة"),
  m("أملوديبين 5mg — 30 قرص (Hikma)", "Hikma", 850, undefined, "خافض لضغط الدم من فئة حاصرات الكالسيوم.", IMG.pill, "حكمة"),
  m("أتورفاستاتين 20mg — 30 قرص (Hikma)", "Hikma", 1450, 1700, "خافض للكوليسترول.", IMG.pill, "حكمة"),

  // ===== نوفارتيس Novartis =====
  m("ديوفان 80mg — 28 قرص (Diovan)", "Novartis", 4800, 5500, "فالسارتان — لعلاج ارتفاع ضغط الدم وقصور القلب.", IMG.pill, "نوفارتيس"),
  m("ديوفان 160mg — 28 قرص (Diovan)", "Novartis", 6200, undefined, "فالسارتان جرعة عالية لضغط الدم المرتفع.", IMG.pill, "نوفارتيس"),
  m("كو-ديوفان 160/12.5mg — 28 قرص", "Novartis", 6800, undefined, "فالسارتان + هيدروكلوروثيازيد.", IMG.pill, "نوفارتيس"),
  m("غاليفوس 50mg — 28 قرص (Galvus)", "Novartis", 7400, 8200, "فيلداغليبتين لعلاج السكري النوع الثاني.", IMG.pill, "نوفارتيس"),
  m("غاليفوس ميت 50/1000mg — 60 قرص", "Novartis", 9800, undefined, "فيلداغليبتين + ميتفورمين.", IMG.pill, "نوفارتيس"),
  m("توباماكس 50mg — 60 قرص (Topamax)", "Novartis", 8500, undefined, "توبيرامات للصداع النصفي والصرع.", IMG.pill, "نوفارتيس"),
  m("ريتالين 10mg — 30 قرص (Ritalin)", "Novartis", 5800, undefined, "ميثيلفينيدات لعلاج فرط الحركة وتشتت الانتباه.", IMG.pill, "نوفارتيس"),
  m("فولتارين 50mg — 20 قرص (Voltaren)", "Novartis", 1800, 2200, "ديكلوفيناك — مسكن قوي للالتهابات والآلام.", IMG.pill, "نوفارتيس"),
  m("فولتارين جل 1% — 50غ", "Novartis", 2400, undefined, "جل موضعي لتسكين آلام المفاصل والعضلات.", IMG.cream, "نوفارتيس"),
  m("سيمبالتا 30mg — 28 كبسولة (Cymbalta)", "Novartis", 9500, undefined, "دولوكستين لعلاج الاكتئاب والقلق وآلام الأعصاب.", IMG.caps, "نوفارتيس"),
  m("إكسلون لاصقة 9.5mg — 30 لاصقة", "Novartis", 18500, undefined, "ريفاستيغمين لعلاج الزهايمر — لاصقة جلدية.", IMG.bottle, "نوفارتيس"),
  m("غليفك 100mg — 60 كبسولة (Glivec)", "Novartis", 42000, undefined, "إيماتينيب — علاج موجه لسرطان الدم النخاعي.", IMG.caps, "نوفارتيس"),
  m("لاميسيل كريم 1% — 15غ", "Novartis", 2200, 2600, "تيربينافين — مضاد فطريات موضعي.", IMG.cream, "نوفارتيس"),
  m("تيغريتول 200mg — 50 قرص (Tegretol)", "Novartis", 2400, undefined, "كاربامازيبين للصرع وآلام الأعصاب.", IMG.pill, "نوفارتيس"),
  m("سانديميون 100mg — 50 كبسولة", "Novartis", 28500, undefined, "سيكلوسبورين — مثبط مناعي بعد زراعة الأعضاء.", IMG.caps, "نوفارتيس"),
  m("ميامباستول قطرة عين 5مل", "Novartis", 3200, undefined, "قطرات لعلاج الجلوكوما (المياه الزرقاء).", IMG.bottle, "نوفارتيس"),
  m("نوفالجين 500mg — 20 قرص (Novalgin)", "Novartis", 850, undefined, "ميتاميزول — مسكن قوي.", IMG.pill, "نوفارتيس"),
  m("أنتراميسين 250mg — 12 قرص", "Novartis", 1900, undefined, "علاج عدوى المعدة.", IMG.pill, "نوفارتيس"),
  m("جاكافي 5mg — 56 قرص (Jakavi)", "Novartis", 95000, undefined, "روكسوليتينيب — علاج أمراض الدم.", IMG.pill, "نوفارتيس"),
  m("إنترسيتو 24/26mg — 28 قرص", "Novartis", 22500, undefined, "ساكوبيتريل/فالسارتان لقصور القلب.", IMG.pill, "نوفارتيس"),

  // ===== الشركة اليمنية المصرية للأدوية YEPCA =====
  m("بانارال 500mg — 20 قرص (يمنية مصرية)", "YEPCA", 280, 380, "باراسيتامول — مسكن وخافض حرارة محلي الصنع.", IMG.pill, "محلي"),
  m("ياميسين 500mg كبسولات (يمنية مصرية)", "YEPCA", 720, undefined, "أموكسيسيلين — مضاد حيوي محلي.", IMG.caps, "محلي"),
  m("يامي-فلوكس 500mg — 10 أقراص", "YEPCA", 1100, undefined, "سيبروفلوكساسين — مضاد حيوي للمسالك البولية.", IMG.pill, "محلي"),
  m("يامي-كولد شراب للسعال 100مل", "YEPCA", 650, undefined, "شراب مهدئ للسعال ونزلات البرد.", IMG.bottle, "محلي"),
  m("يامي-فاست 400mg إيبوبروفين — 20 قرص", "YEPCA", 420, undefined, "مضاد التهاب ومسكن.", IMG.pill, "محلي"),
  m("يامي-ميت 500mg ميتفورمين — 30 قرص", "YEPCA", 380, undefined, "خافض لسكر الدم.", IMG.pill, "محلي"),
  m("يامي-بريل 5mg إنالابريل — 30 قرص", "YEPCA", 480, undefined, "خافض لضغط الدم.", IMG.pill, "محلي"),
  m("يامي-زول 20mg أوميبرازول — 14 كبسولة", "YEPCA", 540, 700, "علاج قرحة المعدة والحموضة.", IMG.caps, "محلي"),
  m("يامي-سال شراب فيتامينات أطفال 120مل", "YEPCA", 980, undefined, "مكمل فيتامينات للأطفال.", IMG.bottle, "محلي"),
  m("يامي-أزيث 500mg — 3 أقراص", "YEPCA", 1100, undefined, "أزيثرومايسين — مضاد حيوي.", IMG.pill, "محلي"),
  m("يامي-كاف شراب طارد للبلغم 100مل", "YEPCA", 580, undefined, "طارد للبلغم في نزلات البرد.", IMG.bottle, "محلي"),
  m("يامي-كال أقراص كالسيوم + D3 — 30 قرص", "YEPCA", 720, undefined, "مكمل كالسيوم لصحة العظام.", IMG.pill, "محلي"),
  m("يامي-فيرول كبسولات حديد — 30 كبسولة", "YEPCA", 650, undefined, "علاج فقر الدم.", IMG.caps, "محلي"),
  m("يامي-ديك 50mg ديكلوفيناك — 20 قرص", "YEPCA", 350, undefined, "مسكن ومضاد التهاب.", IMG.pill, "محلي"),
  m("يامي-تير 10mg سيتيريزين — 10 أقراص", "YEPCA", 320, undefined, "مضاد حساسية.", IMG.pill, "محلي"),
  m("يامي-فلام كريم ديكلوفيناك 1% — 30غ", "YEPCA", 780, undefined, "كريم موضعي لآلام المفاصل.", IMG.cream, "محلي"),
  m("يامي-ميترو 500mg ميترونيدازول — 20 قرص", "YEPCA", 480, undefined, "مضاد للطفيليات.", IMG.pill, "محلي"),
  m("يامي-بان شراب أطفال باراسيتامول 60مل", "YEPCA", 380, undefined, "خافض حرارة للأطفال.", IMG.bottle, "محلي"),
  m("يامي-فيت B-Complex — 30 قرص", "YEPCA", 580, undefined, "مكمل فيتامينات B.", IMG.pill, "محلي"),
  m("يامي-أوغ شراب أموكسي/كلاف 156mg — 100مل", "YEPCA", 1400, undefined, "مضاد حيوي مركّب للأطفال.", IMG.bottle, "محلي"),
];

// ===== شركة ديرما الأردنية للأدوية Derma Jordan (Pharma) =====
// منتجات علاجية ودوائية من ديرما الأردنية، مع صور دوائية احترافية واستخدامات
// مأخوذة من معلومات الشركة وموقعها الرسمي. تفاصيل الاستخدام التفصيلية تُعرض
// تلقائياً عبر معلومات Gemini داخل صفحة المنتج.
let dermaJoId = 5000;
const dj = (
  name: string,
  price: number,
  oldPrice: number | undefined,
  desc: string,
  img: string,
  cat: "medicine" | "cosmetics" = "medicine",
): Product => ({
  id: dermaJoId++, name, brand: "Derma Jordan", price, oldPrice, cat, img,
  badge: "ديرما الأردنية", desc,
});
const dermaJordan: Product[] = [
  // أدوية ومستحضرات علاجية
  dj("ديرماكلين كريم مضاد للفطريات 30غ", 2400, 2900, "كريم موضعي يحتوي على كلوتريمازول لعلاج فطريات الجلد والقدم الرياضي.", IMG.dermaTube),
  dj("ديرماكورت 1% كريم هيدروكورتيزون 15غ", 1900, undefined, "ستيرويد موضعي خفيف لعلاج الالتهابات الجلدية والإكزيما الخفيفة.", IMG.dermaTube),
  dj("ديرماسالك 5% جل حب الشباب 30غ", 2800, 3400, "بيروكسيد البنزويل لعلاج حب الشباب الخفيف إلى المتوسط.", IMG.dermaTube),
  dj("ديرما-A تريتينوين 0.025% كريم 20غ", 4200, undefined, "كريم ريتينويد طبي لعلاج حب الشباب وتجديد خلايا البشرة (وصفة طبية).", IMG.dermaCream),
  dj("ديرماسيد كلينداميسين 1% جل 30غ", 3100, 3600, "مضاد حيوي موضعي لعلاج حب الشباب الالتهابي.", IMG.dermaTube),
  dj("ديرما-زنك أكسيد كريم وقاية تسلخات 50غ", 1600, undefined, "كريم حماية للحفاضات وعلاج التسلخات الجلدية.", IMG.dermaTube),
  dj("ديرما-أوريا 10% كريم اليوريا 100غ", 2200, 2700, "مرطب طبي مكثف لجفاف الجلد الشديد وتشقق القدمين.", IMG.dermaCream),
  dj("ديرماثيرم بنزوكايين جل تخدير موضعي 15غ", 1800, undefined, "جل مخدر موضعي لتخفيف ألم اللثة والقروح الفموية.", IMG.dermaTube),
  dj("ديرماهيل ميبيروسين 2% مرهم 15غ", 3400, 3900, "مرهم مضاد حيوي لعلاج الالتهابات الجلدية البكتيرية والجروح.", IMG.ointment),
  dj("ديرماكير سيلفر سلفاديازين 1% كريم 50غ", 4800, undefined, "كريم مضاد بكتيري لعلاج الحروق ومنع العدوى.", IMG.dermaCream),
  dj("ديرمافلوكس سيبروفلوكساسين قطرة عين 5مل", 1900, undefined, "قطرات عين مضادة للبكتيريا لعلاج التهابات الملتحمة.", IMG.drops),
  dj("ديرما-كيتو كيتوكونازول 2% شامبو 100مل", 3800, 4400, "شامبو طبي لعلاج قشرة الرأس الفطرية والتهاب الجلد الدهني.", IMG.shampoo),
  dj("ديرما-بيرميث بيرمثرين 5% كريم 30غ", 4500, undefined, "علاج الجرب وقمل الرأس — يطبق موضعياً.", IMG.dermaTube),
  dj("ديرماليدوكين ليدوكائين 5% كريم 30غ", 2900, undefined, "مخدر موضعي لتخفيف الألم قبل الإجراءات الطبية البسيطة.", IMG.dermaTube),
  dj("ديرما-D فيتامين D3 1000 IU — 30 قرص", 1400, 1800, "مكمل غذائي لدعم صحة العظام وامتصاص الكالسيوم.", IMG.pillsAmber, "medicine"),
  // مستحضرات تجميل طبية (ديرما كير)
  dj("ديرما-سي سيروم فيتامين C الأردني 30مل", 4500, 5400, "سيروم مضاد للأكسدة لتفتيح البشرة وتوحيد اللون.", IMG.dermaSerum, "cosmetics"),
  dj("ديرما-هيا حمض الهيالورونيك سيروم 30مل", 4800, undefined, "ترطيب عميق ونعومة فورية للبشرة الجافة.", IMG.dermaSerum, "cosmetics"),
  dj("ديرما-سن واقي شمس SPF 50 ملون 50مل", 3900, 4600, "واقي شمسي طبي ملون مناسب للبشرة الحساسة والمعرضة لحب الشباب.", IMG.sunscreen, "cosmetics"),
];

export const products: Product[] = [...core, ...meds, ...kids, ...cosmetics, ...vitamins, ...now, ...dermaJordan];

export function formatPrice(n: number) {
  return n.toLocaleString("ar-EG");
}

export function getProductById(id: number) {
  return products.find((p) => p.id === id);
}
