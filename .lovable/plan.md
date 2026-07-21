# Aden Medical Galaxy — خطة تنفيذ محاذية للواقع

## ⚠️ Reality Check أولاً

الكود اللي وصلني فيه مشاكل تمنع تشغيله كما هو — لازم أعدّله قبل التنفيذ:

| المشكلة في الـ Blueprint | الواقع في مشروعك |
|---|---|
| `from '@tanstack/start'` | الصحيح: `@tanstack/react-start` |
| `.validator()` | الصحيح: `.inputValidator()` |
| `from '@/lib/supabase/server'` | غير موجود — عندنا `requireSupabaseAuth` middleware و`supabaseAdmin` |
| `requireSupabaseAuth()` كدالة | هي **middleware** تُمرَّر عبر `.middleware([requireSupabaseAuth])` |
| `CREATE TABLE medical_directory` | **مكرر** — عندنا `hc_doctors` (45 عمود) + `hc_locations` |
| `CREATE TABLE suppliers_registry` | **مكرر** — عندنا `sup_suppliers` (12 عمود) + `sup_supplier_products` |
| `'use client'` + `framer-motion` | غير مطلوب في TanStack Start؛ وframer-motion غير مثبّت |
| `console.log` للنشر الفعلي | لا يوجد integration فعلي لفيسبوك/واتساب |
| SQL بدون `GRANT` + RLS | ممنوع — كل جدول `public` يجب أن يأخذ GRANTs + RLS |

**الخلاصة:** لن أضيف جداول مكررة. سأبني على `hc_*` و`sup_*` و`catalog_products` الموجودة.

---

## الخطة (3 دفعات صغيرة قابلة للمراجعة)

### Batch 1 — SBDMA Fields + Directory Search (بدون جداول جديدة)

**Migration واحد:**
- `ALTER TABLE catalog_products ADD COLUMN sbdma_official_price NUMERIC(10,2), agent_name TEXT, manufacturer_country TEXT` (كلها nullable، لا يكسر الموجود).
- `CREATE INDEX` على `agent_name` و`sbdma_official_price`.
- لا جداول جديدة.

**Server functions جديدة في `src/lib/medical-directory.functions.ts`:**
- `searchAdenDirectory({ query, entityType?, district? })` — يبحث في `hc_doctors` + `hc_locations` (join على `hc_doctor_locations`). محمي بـ `requireSupabaseAuth` (RLS تعمل تلقائياً).
- `findSuppliersByCompany({ companyName })` — يبحث في `sup_suppliers` + `sup_supplier_products`. محمي بـ auth.
- `listProductsByAgent({ agentName })` — يقرأ من `catalog_products`.

**استخدام صحيح:**
```ts
export const searchAdenDirectory = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data, context }) => {
    return context.supabase.from('hc_doctors')...
  });
```

### Batch 2 — SBDMA Bulk Import (Admin only)

- Server route: `src/routes/api/public/sbdma-import.ts` — POST يستقبل ملف JSON. محمي بـ HMAC signature (وليس مفتوح للعامة).
- بديل أبسط: صفحة `/admin-sbdma-import` تحت `_authenticated/` تسمح للـ admin برفع JSON، وتستدعي server fn `bulkUpsertSBDMAPrices` (تتحقق من `has_role(admin)` ثم تستخدم `supabaseAdmin` عبر `await import` داخل الـ handler).
- تحديث `catalog_products` عبر `upsert` على مفتاح موجود (نحدد المفتاح: `name` غير كافٍ — نستخدم `barcode` من `catalog_barcodes` أو `sku`).
- **سؤال مفتوح:** ما هو المفتاح الفريد الذي سنستخدمه للـ upsert؟ (سأسأل قبل التنفيذ).

### Batch 3 — Medical Assistant UI Widget

- Component جديد: `src/components/medical/MedicalAssistantWidget.tsx` — بدون `'use client'` (TanStack Start SSR)، بدون framer-motion (نستخدم Tailwind transitions).
- يستخدم الألوان الموجودة في design tokens (teal + nebula من phase 11B).
- يستدعي server functions من Batch 1 عبر `useServerFn` + TanStack Query.
- يُدمج في `__root.tsx` كـ floating widget يظهر فقط للمستخدمين المسجّلين.

### ما هو **مُستبعَد** من هذه الخطة (يحتاج قرار منفصل):

1. **WhatsApp Bot / Facebook Autopilot** — يتطلب:
   - Meta Business API credentials (secret via `secrets--add_secret`).
   - Webhook verification token.
   - Rate limiting + moderation.
   - قرر منفصل بعد Batch 1-3.
2. **Seed data الحقيقي لأطباء عدن** — يحتاج مصدر موثّق (لا يمكنني اختراع أرقام هواتف). إمّا نبني UI لإدخال يدوي عبر admin، أو ننتظر ملف JSON منك.
3. **Daily post cron** — سأضيفه بعد ما تربط حساب Meta فعلياً.

---

## الترتيب المقترح

1. أبدأ بـ **Batch 1** فقط (migration + 3 server functions + اختبار عبر console).
2. أعرضه للمراجعة → إذا OK، أنتقل لـ Batch 2.
3. Batch 3 UI بعد ما نتحقق أن الـ backend يعمل.

**سؤال قبل البدء:** ما مفتاح الـ upsert الذي تفضّله للـ SBDMA prices؟
- (أ) `barcode` (عبر `catalog_barcodes`) — الأدق.
- (ب) `sku` على `catalog_products`.
- (ج) `name` + `manufacturer` — الأضعف لكن الأسهل.
