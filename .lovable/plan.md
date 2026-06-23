# خطة الخيار الأول – تحسين واجهة المستخدم (UI/UX)

تركيز على الواجهة فقط، بدون تغيير منطق الأعمال أو الـ backend.

## 1. الوضع المظلم (Dark Mode)

ملاحظة هامة: `src/styles.css` يحتوي بالفعل على متغيرات `.dark` كاملة (oklch tokens)، ويُستخدم `@custom-variant dark` على نمط Tailwind v4. الأساس جاهز — نحتاج فقط Provider وزر تبديل.

- **جديد** `src/lib/theme-provider.tsx`
  - Context للوضع: `light | dark | system`
  - يحفظ في `localStorage` بمفتاح `pharmacy-ui-theme`
  - يضيف/يزيل class `dark` على `document.documentElement`
  - SSR-safe: قراءة localStorage داخل `useEffect` فقط (TanStack Start يعمل بـ SSR)
  - script صغير في `__root.tsx` head لمنع وميض الشاشة (FOUC) قبل hydrate
- **جديد** `src/components/theme-toggle.tsx`
  - زر `DropdownMenu` (shadcn موجود) بخيارات: فاتح / مظلم / النظام
  - أيقونات Sun/Moon/Monitor من lucide
- **تعديل** `src/routes/__root.tsx`
  - تغليف الـ Outlet بـ `<ThemeProvider>` داخل `RootComponent`
  - إضافة script حقن class الوضع مبكراً في `shellComponent`
  - الزر يُضاف داخل `site-chrome.tsx` (الهيدر الموجود) — وليس عائماً فوق المحتوى

## 2. أنيميشن Framer Motion

- تثبيت `framer-motion` عبر `bun add`
- **جديد** `src/components/page-transition.tsx` — fade + slide خفيف عند تغيير المسار
- **جديد** `src/components/animated-section.tsx` — `whileInView` للظهور عند التمرير
- تطبيق `PageTransition` حول `<Outlet />` في `__root.tsx` باستخدام `AnimatePresence` مع `useLocation().pathname` كمفتاح
- احترام `prefers-reduced-motion` (تعطيل الحركة)

## 3. التجاوب (Responsiveness)

مراجعة مستهدفة فقط للصفحات/المكونات الرئيسية الأعلى استخداماً:
- `src/components/site-chrome.tsx` (الهيدر + التنقل)
- `src/routes/index.tsx` (الصفحة الرئيسية)
- `src/routes/products.tsx`, `src/routes/cart.tsx`
- `src/components/product-card.tsx`

تطبيق نمط `grid grid-cols-[minmax(0,1fr)_auto] sm:flex` + `min-w-0` + `shrink-0` + `truncate` للصفوف التي تجمع نصاً وأدوات (وفق responsive-layout-patterns). لن أعدّل كل صفحة admin — فقط الصفحات التي يراها الزائر.

## 4. RTL

- `<html dir="rtl">` موجود بالفعل في `__root.tsx`
- مراجعة استخدامات `ml-*`/`mr-*`/`left-*`/`right-*` في المكونات المعدّلة وتحويلها إلى `ms-*`/`me-*`/`start-*`/`end-*` حيث يلزم
- التأكد من اتجاه الأيقونات (Chevron) في القوائم

## الملفات

**جديدة:**
- `src/lib/theme-provider.tsx`
- `src/components/theme-toggle.tsx`
- `src/components/page-transition.tsx`
- `src/components/animated-section.tsx`

**معدّلة:**
- `src/routes/__root.tsx` — ThemeProvider + anti-FOUC script + PageTransition/AnimatePresence
- `src/components/site-chrome.tsx` — إدراج `ThemeToggle` + تحسينات تجاوب الهيدر
- `package.json` — `framer-motion`

**لن تُمسّ:**
- أي ملف backend / server function / migration
- ملفات `src/integrations/supabase/*` التلقائية
- منطق السلة / الطلبات / الفواتير

## خارج النطاق

- لا تغييرات على نظام الفواتير، الدفع، أو التقارير (مؤجل للمرحلة التالية)
- لا إعادة تصميم شامل لصفحات الإدارة (`/admin-*`)

## ملاحظات تقنية

- Tailwind v4 على هذا المشروع — لا يوجد `tailwind.config.js`، التوكنز في `@theme` داخل `src/styles.css` (موجودة). لن أضيف `@tailwind base/...` (نمط v3).
- `ThemeProvider` يقرأ `window`/`localStorage` داخل `useEffect` فقط لتجنّب SSR crash.
- script منع الوميض يُكتب inline في `<head>` ويقرأ `localStorage` ويضيف class قبل أول رسم.
