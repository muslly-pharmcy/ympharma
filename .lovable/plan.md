## نظرة عامة

تنفيذ 4 محاور بالتوازي بناءً على إجاباتك:

1. **تحديث بيانات التواصل** (فوري)
2. **استيراد كامل المخزون** (4654 صنف مع تجميع المكرر)
3. **توليد صور Gemini لكل صنف** (مهمة خلفية طويلة)
4. **كشف "ما هو في الداتابيس ولا يظهر"** (تقرير تدقيقي)

---

## 1) بيانات التواصل + فيسبوك

تحديث `src/shared/branding.ts`:
- `phone`: `+967 782 878 280`
- `whatsapp`: `+967782878280`
- إضافة `facebookUrl` و `facebookBusinessId: '1170639849472726'` و `metaAssetId`
- تحديث Navbar/Footer/Contact لعرض أيقونة فيسبوك تربط للصفحة العامة (وليس business.facebook.com الذي يتطلب تسجيل دخول للأدمن — الرابط اللي أرسلته هو لوحة إدارة، سأستنتج منه أن الصفحة العامة موجودة وأضع placeholder مع تنبيه لك لإرسال الرابط العام `facebook.com/...` إن أردت عرضه للزوار).
- Meta tags: إضافة `og:see_also` و `article:publisher` بالإشارة إلى الصفحة.

**ملاحظة عن "صلاحية النشر على ميتا"**: الرابط اللي أرسلته هو Business Manager URL يفتح عندك أنت فقط. النشر التلقائي على Facebook/Instagram من الموقع يتطلب:
- Facebook App + Long-Lived Page Access Token (يجب أن تنشئه في Meta for Developers)
- تخزينه كـ secret في Cloud

سأبني الـ endpoint (`/api/publish-facebook`) جاهزاً، لكن التفعيل الفعلي ينتظر توليد الـ Access Token منك.

---

## 2) استيراد 4654 صنف مع تجميع المكرر

**خطوات التنفيذ (script + migration):**

1. **إعداد البنية التحتية (migration واحدة):**
   - إنشاء `wh_warehouses` رئيسي: `"صيدلية المصلي — المخزن الرئيسي"` تحت المنظمة الحالية
   - إضافة عمود `store_code_key` (unique index جزئي) للاستيراد idempotent

2. **قراءة الإكسل عبر pandas** (`code--exec`):
   - تطبيع أسماء الأصناف (إزالة أسماء الموردين من نهاية الاسم)
   - **التجميع حسب `الكود`**: كل صنف = صف واحد في `catalog_products`
   - جمع الأرصدة من موردين متعددين
   - إسناد أقدم `تاريخ انتهاء` كتنبيه FEFO

3. **إسناد الفئة**: تصنيف تلقائي بالكلمات المفتاحية (فوار → digestive، أقراص/كبسول عام → pain-fever، شراب أطفال → mother-baby، إلخ). الأصناف غير المصنفة تدخل فئة جديدة `"عام / General"`.

4. **حساب السعر**: `القيمة ÷ الرصيد = تكلفة الوحدة` → `selling_price = round(cost × 1.25, 2)` (هامش 25% افتراضي — قابل للتعديل من `/admin-inventory`).

5. **إدخال البيانات (batching عبر supabase--insert):**
   - `catalog_products`: ~2500 صنف فريد متوقع (بعد التجميع)
   - `inv_stock_batches`: صف لكل (product × supplier × expiry)
   - كل الأصناف `status='published'` و `is_public=true` ليظهروا في `/shop`

---

## 3) توليد الصور عبر Gemini (مهمة خلفية)

**⚠️ تنبيه أخير**: 4654 صورة × ~2 ثانية × credits = عملية تستغرق **~3-4 ساعات** وتستهلك **رصيد كبير** من AI credits. أنت وافقت — سأمضي، لكن سأبنيها كـ **queue** قابلة للإيقاف.

**التصميم:**

1. **جدول `image_generation_queue`** (migration):
   - `product_id`, `status` (pending/processing/done/failed), `image_url`, `attempts`, `error`

2. **Server function** `/api/generate-product-image` (POST): يأخذ `product_id`، يستدعي Gemini `google/gemini-2.5-flash-image` عبر AI Gateway مع prompt:
   > *"Professional pharmaceutical product photo of [name_ar]. Clean white background, studio lighting, medical packaging, high detail, e-commerce style."*
   - يحمّل الصورة الناتجة إلى Supabase Storage bucket `product-images`
   - يحدّث `catalog_products.image_url`

3. **Worker cron** كل 5 دقائق: يعالج 20 صنف من الطابور (لتجنب rate limits).

4. **لوحة تحكم** `/admin-image-queue`: تعرض التقدم (X من 4654 مكتمل)، أزرار Pause/Resume/Retry-failed.

**Fallback**: أي صنف يفشل توليده 3 مرات → يستخدم أيقونة الفئة الافتراضية.

---

## 4) تدقيق: "ما في الداتابيس ولا يظهر"

سأنشئ `docs/data-visibility-audit.md` بعد فحص شامل. المرشحون الرئيسيون (من فهرس 200+ جدول):

| المجال | الجداول | الوضع الحالي |
|---|---|---|
| المواعيد الطبية | `hc_appointments`, `hc_doctors`, `hc_specialties` | البيانات موجودة، لا توجد صفحة عامة للحجز |
| التأمين الصحي | `insv2_plans`, `insv2_claims`, `ins_companies` | نظام كامل بدون واجهة |
| Loyalty | `crm_loyalty_accounts`, `crm_reward_catalog` | برنامج ولاء بدون صفحة `/rewards` |
| الوصفات المرفوعة | `prescription_extractions` | يعمل في `/vision-lab` لكن الأدمن لا يرى قائمة موحدة |
| CRM Campaigns | `crm_campaigns`, `campaign_deliveries` | إرسال يعمل بدون dashboard |
| Marketplace الصيدليات | `pn_pharmacies` (5 صيدليات) | لا توجد صفحة `/pharmacies` تعرضها |
| الأطباء | `hc_doctors` | لا توجد صفحة `/doctors` عامة |

سأضع خطة عرض على مرحلتين للأولوية: **(أ) صفحات القراءة العامة** (`/doctors`, `/pharmacies`, `/rewards`), ثم **(ب) لوحات الإدارة** المفقودة.

---

## تفاصيل تقنية

**الأدوات:** `supabase--migration`, `code--exec` (pandas + psql COPY)، `supabase--insert` للـ batches، AI Gateway (`google/gemini-2.5-flash-image`), Supabase Storage.

**Idempotency:** الاستيراد يعتمد على `catalog_products.store_code` كمفتاح فريد — يمكن إعادة تشغيله بأمان.

**الترتيب المتوازي:**
```text
[Migration: warehouse + queue table]  ──┐
[Contact update: branding.ts]        ──┼── build مباشر
[Import script: 4654 items]          ──┘
        │
        └──► [Enqueue 4654 image jobs] ──► [Cron worker running]
```

---

## المخرجات النهائية

- `/shop` يعرض 4654+ صنف بالسعر والتوفر ✓
- `/admin-inventory` جدول قابل للتعديل ✓
- بيانات التواصل الجديدة في كل الموقع ✓
- Facebook link ظاهر + endpoint نشر جاهز (ينتظر Access Token) ⏳
- طابور صور يعمل بالخلفية + لوحة `/admin-image-queue` ✓
- تقرير `docs/data-visibility-audit.md` + خطة مرحلتين ✓

هل أبدأ التنفيذ؟