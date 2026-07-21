
## الهدف

بدلاً من بناء نظام موازٍ (`store_products` + `/store/*`)، سنُثري البنية القائمة: **`catalog_products` + `/catalog` + `search_products`**. البيانات ستأتي عبر `/sbdma-import` الموجود. سنُظهر كل منتج ببطاقة تحوي **الصورة + السعر + المورد** مع زر "🤖 شرح بالذكاء" يستدعي أداة AI جديدة (`store_query`) تُلخّص كل ما يعرفه النظام عن الصنف. **تاريخ الانتهاء لن يُعرض في الواجهة** (يبقى في DB للاستخدامات الطبية الأخرى).

## نطاق التغيير

### 1. قاعدة البيانات (migration واحد صغير)
- التحقق من وجود `price_amount` / `image_url` في `catalog_products` (موجودان فعلياً: `price` وحقول media منفصلة عبر `catalog_product_media`).
- إضافة عمود `retail_price numeric(15,3)` إن لم يوجد بديل مناسب — **نفحص أولاً**.
- **لا يوجد جدول جديد**. RLS الحالية على `catalog_products` تكفي (3 سياسات موجودة).
- **الاستيراد يستمر عبر `catalog_import_jobs` الموجود** — سنضيف mapping لعمود `القيمة/price` في `sbdma-import.functions.ts::analyzeSbdmaImport`.

### 2. Server Functions (توسيع لا استبدال)
- **`src/lib/catalog.functions.ts`**: توسيع `listCatalogProducts` لإرجاع `price` + `primary_image_url` (join مع `catalog_product_media` حيث `is_primary=true`) + `supplier_name`. الاستعلامات تمر عبر `context.supabase` مع `requireSupabaseAuth` (كما هي الآن).
- **`src/lib/catalog.functions.ts`**: إضافة `getProductAiSummary({ productId })` — تجمع بيانات المنتج + الرصيد الإجمالي من `inv_stock_batches` + بيانات SBDMA + المورد، تمرّرها إلى Kernel عبر أداة `store_query` وتُعيد نصاً عربياً.

### 3. AI Tool جديدة: `store_query`
- تسجيل في `src/lib/ai/tools.server.ts` + metadata في `src/lib/ai/runtime/tool-registry.server.ts` (capability: `read`, owner: `catalog`, timeout: 8s).
- المدخلات: `productId` (uuid).
- المخرجات: JSON منظم `{ name, price, stock_qty, supplier, category, generic_name, description }` — يُغذّي Kernel prompt.
- تمر عبر `Safety Layer` + `Budget Engine` + `Capability Registry` (كأي أداة أخرى — لا استثناءات).

### 4. الواجهات (تعديل ملفات موجودة فقط)
- **`src/routes/_authenticated/catalog.index.tsx`**: تحويل الجدول إلى شبكة بطاقات (grid). كل بطاقة: صورة (fallback: أيقونة `Pill` من lucide) + اسم + سعر بالريال اليمني + المورد + زر "التفاصيل".
- **`src/routes/_authenticated/catalog.$productId.tsx`**: 
  - إخفاء أي حقول انتهاء صلاحية من العرض (مع إبقائها في الـ query كي لا نكسر تكامل البيانات).
  - إضافة قسم "🤖 شرح ذكي" بزر يستدعي `getProductAiSummary` ويعرض النتيجة في Card. حالة تحميل + `ErrorBoundary` الموجود.
- **البحث**: `useDeferredValue` للـ debounce (كما طلب البرومبت).

### 5. Storage (استعمال الموجود)
- Bucket `product-images` **موجود بالفعل** (تم إنشاؤه في Supabase Storefront v1).
- سياسات: قراءة عامة + كتابة authenticated (موجودة).
- رفع الصور للمنتج يمر عبر `catalog-media.functions.ts` الموجود — **لن نُنشئ حل رفع جديد**.

## ما لن نفعله (صراحةً)

- ❌ لا `store_products` جديد.
- ❌ لا `/store/*` routes جديدة.
- ❌ لا `scripts/seed-store.ts` — نستخدم `/sbdma-import` الموجود مع محرك القرار MATCHED/NEW/AMBIGUOUS.
- ❌ لا `(supabase as any)` — نستخدم `context.supabase` المُنمَّط من `requireSupabaseAuth`.
- ❌ لا `admin/inventory` منفصل — التحرير موجود في `/warehouses`.

## التسلسل

1. Migration تحقق/إضافة `retail_price` إن لزم.
2. توسيع `catalog.functions.ts` (list + AI summary).
3. تسجيل `store_query` في Tool Registry + tools.server.
4. تحديث `catalog.index.tsx` (بطاقات + بحث).
5. تحديث `catalog.$productId.tsx` (زر شرح AI + إخفاء الانتهاء).
6. تحديث `sbdma-import.functions.ts` لتضمين `price`.
7. `bunx tsgo` نظيف قبل التسليم.

## تفاصيل تقنية

- **حساب المخزون الإجمالي**: `SUM(quantity_on_hand)` من `inv_stock_batches WHERE product_id = ?` — يُحسب على الخادم داخل `getProductAiSummary`.
- **Kernel dispatch**: `dispatch(actor, { agentKey: 'catalog_advisor', input: prompt, toolInputs: { store_query: { productId } } })`. نستخدم agent `catalog_advisor` — نتحقق من وجوده في `air_agents`، إن لم يوجد نُضيف صف واحد في نفس الـ migration.
- **Fallback الصورة**: `<Pill className="w-full h-full text-primary/40" />` بدل صورة placeholder خارجية.
- **العملة**: `Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' })`.

## المخاطر

- **حجم Kernel prompt**: بيانات المنتج قد تكون كبيرة → نقتصر على 8 حقول.
- **agent `catalog_advisor` غير موجود**: نُضيفه في migration مع `allowed_tools=['store_query']` و prompt approved.
- **تكلفة الاستدعاء**: الزر يُستدعى يدوياً فقط (لا auto-load) — يحمي budget.
