
## الهدف
إضافة طبقة علوية (Overlay) للبحث الذكي بواجهة "سديم كوني" مستوحاة من مواصفاتك، **دون** المساس ببنية قاعدة البيانات الحالية أو تكرار محرك الذكاء الاصطناعي.

## ملاحظات واقعية على المواصفات المُرسَلة
قبل التنفيذ، أوضّح الفجوات بين الكود المقترح والمشروع الفعلي حتى لا نبني على وهم:

1. **الجداول**: لا يوجد جدول `products` بالأعمدة `stock_status / category / price / description`. الموجود فعليًا:
   - `catalog_products` (الأعمدة: `name_ar`, `brand`, `barcode`, `strength`, `status` …)
   - `inv_stock_batches` للمخزون
   - `sup_suppliers` للموردين
2. **الـ Client**: لا يوجد `@/lib/supabase/server`. الموجود الشرعي هو `getPublicSupabase()` من `src/lib/supabase-public.server.ts` (Publishable key + RLS كـ anon) وهو Read-Only بحكم السياسات.
3. **UnifiedAIFederation**: غير موجود. المتوفر هو **Brain Kernel** (`src/lib/ai/runtime/kernel.server.ts`) + `dispatch()` + `runAgent()` مع Safety Layer، Policy Engine، Tool Registry، وحدود ميزانية. سنستخدمه كما هو.
4. **الـ AI models**: نستخدم Lovable AI Gateway (Gemini/GPT عبر الـ kernel) — لا حاجة لأي مفاتيح خارجية أو حديث عن GPT-4/Claude/Gemini بالاسم في الواجهة (تسويقيًا فقط "بحث فيدرالي ذكي").

## المخرجات (ملفات جديدة فقط — بدون تعديل قاعدة البيانات)

### 1. جسر البيانات الآمن — Read-Only
`src/lib/ai/runtime/data-bridge.server.ts`
- دالة `fetchInventoryContext(query, limit=5)` تستخدم `getPublicSupabase()` للقراءة من `catalog_products` (بحث `ilike` على `name_ar` و`brand` و`barcode`).
- تُرجع نصًا مُلخّصًا للـ RAG (اسم/تركيز/حالة/باركود) — لا أعمدة حساسة.
- بلا `UPDATE/DELETE/INSERT` وبلا `service_role`. الأمان مضمون معماريًا (RLS + publishable key).

### 2. Server Function للاستدعاء من الواجهة
`src/lib/cosmic-search.functions.ts`
- `cosmicSearch({ query })` — server fn (POST) بلا `requireSupabaseAuth` (متاح للزوّار على الصفحة الرئيسية)، مع:
  - Rate limit خفيف عبر `public-endpoint-guard` (نستخدم نفس مبدأ IP-hash cooldown داخل الـ fn).
  - حد أقصى لطول `query` = 300 حرف.
- الخطوات: `fetchInventoryContext(query)` ← بناء prompt مُعزّز ← استدعاء `runAgent(actor='anon', agentKey='clinical-copilot' أو 'product-search')`.
- يُرجع `{ answer, matches: Product[], runId, latencyMs }`.

### 3. مكوّن الواجهة الكونية
`src/components/ai/CosmicSearch.tsx`
- خلفية Nebula (طبقتان `radial-gradient` + `blur-3xl` بلون teal/violet مطابق للهوية).
- Glass panel مع حقل إدخال RTL، زر "تحليل ذكي" (أيقونة `Sparkles`)، ومؤشر أمان "بياناتك محمية — قراءة فقط" مع أيقونة `ShieldCheck`.
- `Framer Motion` للـ enter/exit animations.
- استخدام `useMutation` + `useServerFn(cosmicSearch)`؛ عرض النتائج (الملخّص + قائمة المنتجات المطابقة كبطاقات).
- الألوان من design tokens الحالية (teal-500 المطابق للّوجو، لا نضيف hex ثابتة).

### 4. نقطة الإدماج
- زر / قسم في `src/routes/index.tsx` (تحت الـ Hero) لعرض `<CosmicSearch />` — بلا حذف أي محتوى موجود.
- (اختياري) route مستقل `src/routes/search.tsx` لو أردت رابطًا مباشرًا؛ نُنشئه فقط لو طلبت.

## ما لن نلمسه
- لا تعديلات على DB / migrations / RLS.
- لا تعديل على `kernel.server.ts` أو `runAgent` أو الـ Agents الحالية.
- لا `service_role`، لا مفاتيح جديدة، لا connectors إضافية.
- لا تغيير على المسارات المحمية `_authenticated/*`.

## تفاصيل تقنية مختصرة
- `data-bridge.server.ts`: يستخدم `.select('id,name_ar,brand,barcode,strength,status').ilike('name_ar', `%${query}%`).limit(5)`.
- `cosmicSearch` server fn تُنشئ `actor` بسيط `{ userId: null, role: 'anon', orgId: null }` وتمرّره إلى `runAgent` عبر kernel — الـ Policy Engine سيرفض تلقائيًا أي أداة Write.
- Prompt للـ AI: عربي، يفرض "أجب فقط من السياق المُعطى، وإذا كان السؤال طبيًا حسّاسًا اطلب استشارة صيدلي".
- عرض شارة "Powered by MUSLLY AI" بدل ذكر أسماء مزوّدي النماذج.

## سؤال قبل البدء (إن رغبت)
هل تريد الـ Cosmic Search:
- (أ) **مضمّنة في الصفحة الرئيسية** فقط (الأبسط والأسرع)، أم
- (ب) **route مستقل `/search`** بالإضافة إلى القسم في الرئيسية؟

إن لم تحدد، سأنفذ (أ) افتراضيًا.
