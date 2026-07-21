## ⚠️ Reality Check أولاً (قبل أي كود)

الـ blueprints اللي وصلت من "Model" مبنية على **جداول وهمية لا وجود لها** في مشروعك، وستنفجر لحظة أول migration. لازم نصححها قبل التنفيذ:

| البلوبرنت طلب | الواقع في مشروعك |
|---|---|
| `user_profiles` + `user_role` enum | يوجد `profiles` + `user_roles` (RBAC منفصل) + `organization_members` — لا نعيد اختراعها |
| `medical_facilities`, `doctor_profiles`, `supplier_storefronts` | يوجد بالفعل: `hc_doctors`, `hc_locations`, `hc_doctor_practices`, `pn_pharmacies`, `sup_suppliers`, `sup_supplier_products` |
| `patient_medicine_vault` جديد | يوجد `medical_vault_files` + `patient_medications` + `patient_health_events` |
| `catalog_products.sku_code / stock_balance / expiry_date / supplier_name` | العمودي الحقيقي: `catalog_products` مع `name_ar/brand/barcode/requires_prescription/status`، والمخزون في `inv_stock_batches` (FEFO) مع `expiry_date` + `qty_on_hand` — الأعمدة اللي طلبها Model غير موجودة |
| `createClient()` من `@/lib/supabase/server`، `requireSupabaseAuth()` بلا middleware، `@tanstack/start` | الواقع: `@tanstack/react-start`، `createServerFn(...).middleware([requireSupabaseAuth])` مع `context.supabase/userId`، عميل الأدمن يُحمَّل داخل الـ handler فقط |
| `import { google } from '@ai-sdk/google'` | مشروعك يستخدم Lovable AI Gateway عبر `createLovableAiGatewayProvider` — لا مفاتيح Google مباشرة |
| Twilio / Meta فوراً | خارج نطاق البنية الحالية، ويحتاج secrets وأرقام مفوّتة — قرار منفصل |
| "Framer Motion / next.js style JSX" مع أكواد ناقصة (`<motion.div ...` مقطوعة) | مشروعك TanStack Start + Tailwind v4، والأكواد المرسلة غير قابلة للصق (Syntax مبتور) |

**الخلاصة:** لا يمكن اعتماد أي من الأكواد الأربعة كما هي. لكن الأفكار **الجوهرية** ممتازة ومنفذة على البنية الحقيقية.

---

## الخطة المقترحة — 4 شحنات مستقلة (كل واحدة قابلة للإيقاف)

### Shipment S1 — Omni Search v2 (ربط الكرنل بالبيانات الفعلية) ✅ صغير
- توسيع `src/lib/cosmic-search.functions.ts` ليجمع نتائج **متوازية** من:
  - `catalog_products` (موجود)
  - `hc_doctors` + `hc_specialties` (دليل الأطباء)
  - `pn_pharmacies` (الصيدليات)
- توحيدها في `contextText` واحد يمرَّر لـ `dispatch()` في `kernel.server.ts` كأداة (tool) جديدة `search_directory` في `tool-registry`.
- بدون جداول جديدة. بدون `pgvector` (البحث النصي `ilike` كافٍ للمرحلة الأولى — pgvector يأتي لاحقاً كـ Wave منفصل).

### Shipment S2 — Prescription Vision (OCR الروشتات) 🟡 متوسط
- **جدول موجود**: `prescription_extractions` + `prescription_image_blobs` + `prescription_files` — نستخدمها، لا ننشئ `patient_medicine_vault`.
- Server fn جديدة `analyzePrescriptionImage` في `src/lib/prescriptions.mutations.functions.ts`:
  - Middleware: `requireSupabaseAuth`
  - Input: `{ storagePath, mimeType }` (الرفع إلى bucket موجود عبر signed URL)
  - يستدعي Gemini vision عبر Lovable Gateway (`google/gemini-3-flash-preview` — يدعم الصور)
  - يحفظ الاستخراج في `prescription_extractions` (مع مطابقة أدوية عبر `name_ar`/`brand`)
  - يعيد `{ matches: CatalogProduct[], raw: string, confidence }`
- UI: زر "تحليل روشتة" في `/prescriptions` route الموجود يفتح Dialog يعرض النتائج ويسمح بإضافة الأدوية المطابقة للسلة (OTC فقط، والباقي يتحول لطلب صيدلي بشري كما هو مصمم).
- بدون "Auto-Pharmacist offline" في هذه الشحنة — يحتاج نقاش أمني منفصل.

### Shipment S3 — Supplier Invoice OCR + Bulk Import 🟡 متوسط
- **جداول موجودة**: `catalog_import_jobs` + `catalog_import_rows` (من Batch 2 السابق!) + `purchase_orders` + `inv_stock_batches`.
- إضافة **مسار جديد**: صورة فاتورة → Gemini vision → صفوف `catalog_import_rows` (status=NEW/MATCHED/AMBIGUOUS) → مراجعة يدوية → commit → إنشاء `purchase_order` + `inv_stock_batches`.
- Server fns:
  - `analyzeInvoiceImage({ storagePath })` — يستخرج الصفوف
  - `commitInvoiceAsPurchaseOrder({ jobId, warehouseId, supplierId })` — يستخدم `createPurchaseOrder` الموجود
- UI: تبويب جديد في `/sbdma-import` الموجود بدلاً من صفحة منفصلة.

### Shipment S4 — Store Media Bulk (صور الأدوية بالكود) 🟢 صغير
- **موجود**: `catalog_product_media` + `product-images` bucket + `catalog-media.functions.ts`.
- إضافة server fn `linkMediaByBarcode({ storagePath, barcode })` يبحث في `catalog_products.barcode` ويربط تلقائياً.
- Admin utility في `/catalog` يعرض المنتجات بلا صور ويسمح بالرفع الجماعي (ملف بأسماء `<barcode>.jpg`).

---

## ما هو **خارج** الخطة (نعتذر بأدب عن هذه)

1. **Twilio WhatsApp / Meta social autopilot الفوري** — يحتاج قرار: أي رقم؟ أي حساب Meta؟ نضيفه كـ Wave مستقل بعد S1–S4.
2. **إعادة تسمية الجداول** لتطابق أسماء Model الوهمية — سيكسر 200+ سطر من الكود المنتج.
3. **`Framer Motion` مع "gravity/nebula/laser scanner" cinematic** — يمكن إضافة polish بصري لاحقاً في Wave UI مستقل، لكن الأولوية للمنطق أولاً.
4. **`pgvector` semantic search** — يبقى محجوزاً لـ AI SUN CORE v2؛ الآن نستخدم `ilike` (كافٍ لـ 1000 صنف).
5. **"Self-Healing Sentinel" كما صُوّر** — لدينا بالفعل `dlq-recovery`, `ai_events`, `ErrorBoundary`. لا نضاعف الأنظمة.

---

## Technical Details

**Stack constraints المحترمة:**
- TanStack Start v1 + `createServerFn().middleware([requireSupabaseAuth]).inputValidator(z).handler(...)`
- كل استخدام لـ `supabaseAdmin` = `await import('@/integrations/supabase/client.server')` داخل الـ handler
- AI عبر `createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY!)` — لا مفاتيح Google مباشرة
- Vision عبر `google/gemini-3-flash-preview` مع `content: [{type:'text'}, {type:'image_url', image_url:{url}}]`
- الرفع عبر signed URLs لـ bucket `product-images` (موجود) + bucket جديد `prescription-images` (خاص) + `supplier-invoices` (خاص)
- كل جدول جديد يحصل على GRANT + RLS + policies scoped بـ `organization_id` أو `auth.uid()`

**ترتيب التنفيذ المقترح:** S4 → S1 → S3 → S2 (من الأسهل للأصعب، وكل واحدة تنشحن مستقلة).

---

## سؤال قبل ما نبدأ

هل تريد:
- **(أ)** تنفيذ الأربعة بالترتيب المقترح (S4 أولاً، الأسهل والأكثر إفادة فوراً)؟
- **(ب)** البدء بـ S2 (Prescription OCR) لأنه الأكثر تميزاً؟
- **(ج)** البدء بـ S3 (Invoice OCR) لتوفير ساعات الإدخال اليدوي؟
- **(د)** تعديل الخطة (أضف/احذف شحنة)؟