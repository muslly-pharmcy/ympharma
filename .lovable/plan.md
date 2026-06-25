## Titans UI — تكامل كامل مع عزل ستايل

نقل أقسام Titans إلى `sections/`، تثبيت حزمة `motion`، إضافة `titans/ui/Button` مخصص، وعزل ستايلات Titans في scope محدود حتى لا تكسر باقي الموقع.

### 1. التبعيات
```bash
bun add motion react-intersection-observer
```
- `lucide-react` و `framer-motion` مثبتان مسبقاً (نتركهما).
- `motion` (v11+ rebrand) يُستخدم للاستيرادات الجديدة، و `framer-motion` يبقى لباقي الموقع.

### 2. نقل الملفات إلى `sections/`
```
src/components/titans/
├── ui/
│   ├── Button.tsx          (جديد — مخصص لـ titans)
│   ├── GlassCard.tsx       (موجود — يبقى)
│   ├── GoldenBorder.tsx    (موجود — يبقى)
│   └── GradientText.tsx    (موجود — يبقى)
├── motion/
│   ├── Reveal.tsx          (موجود — يبقى)
│   ├── CursorFollower.tsx  (جديد)
│   ├── CountUp.tsx         (جديد)
│   └── ParticleBackground.tsx (جديد)
└── sections/
    ├── HeroTitans.tsx           (نقل من titans/HeroTitans.tsx)
    ├── FeaturesTitans.tsx       (نقل)
    ├── TestimonialsTitans.tsx   (نقل + نسخة محسّنة بنجوم)
    ├── PricingTitans.tsx        (نقل)
    └── FooterTitans.tsx         (نقل)
```
أحذف الملفات القديمة في `titans/` (المستوى الأعلى) بعد النقل.

### 3. تكييف الكود
لكل ملف جديد/منقول:
- إزالة `'use client'` (نمط Next.js — لا حاجة في TanStack Start).
- استبدال JSX المفقود في البلوبرنت (الأكواد المنشورة بها JSX مقطوع — أعيد بناء البنية الكاملة).
- استخدام `motion` package import مباشرة (مثبتة).
- `Button` الجديد يُستخدم فقط داخل أقسام titans، باقي الموقع يستخدم shadcn.

### 4. عزل ستايلات Titans (CRITICAL)
**لن** نلمس `src/styles.css` بنظام ألوان dark عالمي. بدلاً من ذلك:
- أُضيف utilities وtokens خاصة بـ titans داخل `src/styles.css` تحت `@utility` بأسماء مثل:
  - `.titans-scope` — يفرض dark background + font + smoothing على الأطفال.
  - `.stars-bg`, `.glow-gold` — كما في البلوبرنت لكن scoped.
- ألوان Titans (`--titans-gold`, `--titans-purple`, `--titans-red`, `--titans-blue`) موجودة كـ tokens فقط، تُستخدم عبر `bg-[var(--titans-gold)]`.
- صفحة `/titans` تلف كل المحتوى بـ `<main className="titans-scope">` لتطبيق الـ dark theme محلياً فقط.

### 5. تحديث Route
`src/routes/titans.tsx`:
```tsx
import { HeroTitans } from "@/components/titans/sections/HeroTitans";
// ...
function TitansLanding() {
  return (
    <main className="titans-scope min-h-screen">
      <HeroTitans />
      <FeaturesTitans />
      <TestimonialsTitans />
      <PricingTitans />
      <FooterTitans />
    </main>
  );
}
```
وأُضيف `head()` بـ meta عربية للـ SEO.

### 6. تحديث الاستيرادات الأخرى
- `src/routes/_authenticated/pharmacist/dashboard.tsx` يستورد `GlassCard`/`GradientText`/`Reveal` من المسارات الحالية (`titans/ui/...` و`titans/motion/...`) — هذه لا تتغير، فلا حاجة لتعديل.
- لا يوجد كود آخر يستورد من `titans/HeroTitans` ... إلخ خارج `routes/titans.tsx` (تحققت).

### تفاصيل تقنية (للمراجعة)

**لماذا لا نطبق globals.css كما هو:**
البلوبرنت يحتوي:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background-color: #0a0a0b; color: #f8fafc; }
::-webkit-scrollbar { ... gold }
```
هذا يكسر:
- كل صفحات Admin (~55 صفحة) المبنية على light/dark tokens الحالية.
- pharmacist dashboard.
- shadcn components التي تعتمد على `--background`, `--foreground` الموجودة.

**Reveal:** الموجود حالياً يستخدم `framer-motion` + `useInView` من `react-intersection-observer`. سأبقيه ويعمل مع نسخة motion الجديدة لأن motion@11 = framer-motion rebrand (نفس الـ API).

**Button conflict:** `titans/ui/Button` ≠ `ui/button`. لا تعارض لأن المسارات مختلفة. Capitalization في الاستيراد تطابق اسم الملف (`Button.tsx`).

### الملفات النهائية المتأثرة
- إنشاء: `titans/ui/Button.tsx`, `titans/motion/CursorFollower.tsx`, `titans/motion/CountUp.tsx`, `titans/motion/ParticleBackground.tsx`, `titans/sections/*.tsx` (5 ملفات)
- حذف: `titans/HeroTitans.tsx`, `titans/FeaturesTitans.tsx`, `titans/TestimonialsTitans.tsx`, `titans/PricingTitans.tsx`, `titans/FooterTitans.tsx`
- تعديل: `src/routes/titans.tsx`, `src/styles.css` (إضافة `.titans-scope` + utilities فقط)
- `package.json`: + motion, + react-intersection-observer
