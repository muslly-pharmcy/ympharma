# خطة تنفيذية — Wave C.7 R1.2 + Aden Health Network v1

القاعدة الحاكمة (من الدستور v10): بدون كسر الهيكل، بدون جداول موازية لجداول موجودة، بدون Next.js APIs، بدون Edge Functions لمنطق التطبيق. كل موجة = commit مستقل + Regression Log.

---

## المرحلة 0 — R1.2: F-06 (Fake Security Dashboard)

**الحالة الحالية:** `src/modules/security/SecurityModule.tsx` يعرض بيانات ثابتة/وهمية بدون مصدر حقيقي — مضلّل لعميل يظن أن النظام يراقب فعلاً.

**التحقق قبل التنفيذ (Rule 1):** قراءة الملف + تتبّع الاستخدامات، ثم اختيار أحد الفرعين بناءً على الدليل:
- إذا لا يوجد مصدر بيانات حقيقي جاهز → **إخفاء الوحدة** خلف feature flag + شارة "قيد التطوير" + توثيق ADR.
- إذا وُجد مصدر (audit_events, ai_events, error_logs) → ربطه عبر server fn محمي بـ `requireSupabaseAuth` + admin role.

**التسليم:** تعديل `SecurityModule.tsx` فقط، تحديث `RELEASE-GATE.md` + `WAVE-C7-REGRESSION-LOG.md`.

---

## المرحلة A — دليل الأطباء/الموردين (Directory Federation)

**الحقيقة:** `hc_doctors` و `sup_suppliers` موجودان — لا ننشئ `medical_directory`.

1. **Server function موحّد** `src/lib/directory.functions.ts` (public read):
   - `searchDirectory({ query, type?: 'doctor'|'supplier', limit })` باستخدام publishable client (`getPublicSupabase`).
   - يُسقط الأعمدة الحساسة، يُعيد فقط: اسم/تخصص/منطقة/is_verified.
   - `is_verified = true` فقط للعموم؛ صفوف قيد التحقق مخفية.
2. **RLS check:** التحقق من سياسات `hc_doctors`/`sup_suppliers` الحالية — إن كانت مغلقة على `anon` سنضيف سياسة `SELECT TO anon WHERE is_verified = true` عبر migration واحدة صغيرة (ملاحظة: سياسات أعمدة انتقائية عبر view آمنة).
3. **Directory tool للـ Brain Kernel:** تسجيل `directory_search` في `tool-registry.server.ts` (capability جديدة `can_search_directory`) + إتاحته للـ Cosmic agent فقط.
4. **Cosmic Search UI:** تمييز بصري بين بطاقة "منتج" (سلة) وبطاقة "طبيب/مورد" (تخصص + منطقة + رقم verified).

**بدون تغيير:** schema `hc_doctors`/`sup_suppliers`, `cart.functions.ts`, `data-bridge.server.ts` (نضيف bridge ثانٍ منفصل).

---

## المرحلة B — استيراد أسعار الهيئة (SBDMA)

1. **Migration:** إضافة أعمدة اختيارية على `catalog_products`:
   - `sbdma_official_price NUMERIC`, `sbdma_agent_name TEXT`, `sbdma_updated_at TIMESTAMPTZ`, `manufacturer_country TEXT`.
   - Index جزئي على `sbdma_updated_at IS NOT NULL`.
2. **Server function** `src/lib/sbdma-import.functions.ts` محمي بـ `requireSupabaseAuth` + `has_role(auth.uid(), 'admin')`:
   - يستقبل CSV مُحلَّل client-side (papaparse) → Zod validation → `upsert` على `catalog_products` بمفتاح `barcode` (لا `name` لتجنّب التصادم).
   - dry-run mode يُعيد diff قبل الكتابة.
3. **UI:** `src/routes/_authenticated/admin/sbdma-import.tsx` — رفع CSV + معاينة + تأكيد + سجل آخر استيراد.
4. **Audit:** كل استيراد يكتب في `audit_events` (actor, count, checksum).

**بدون تغيير:** جدول `catalog_products` الأساسي (فقط أعمدة إضافية nullable)، منطق البيع.

---

## المرحلة C — بوت واتساب (استعلامي فقط)

**متطلبات المستخدم:** قرار مزوّد + Secrets (خارج نطاق البناء).

1. **قرار مزوّد** (سؤال في بداية المرحلة): UltraMsg (الأبسط) / Meta Cloud API (رسمي) / Twilio (مكلف).
2. **Server route عام** `src/routes/api/public/whatsapp-inbound.ts`:
   - عبر `public-endpoint-guard` (rate limit 60/60s per IP).
   - HMAC signature verification بمفتاح `WHATSAPP_WEBHOOK_SECRET`.
   - قراءة الرسالة → استدعاء Brain Kernel (`dispatch` مع agent مخصص `whatsapp_concierge`) → إرسال الرد عبر مزوّد.
3. **Agent جديد** في `air_agents`: `whatsapp_concierge` — allowed_tools = [`search_products`, `directory_search`], max_tokens=400, temperature=0.2.
4. **جدول** `whatsapp_conversations` موجود بالفعل — نستخدمه لتخزين الرسائل والردود.
5. **Rate limit** لكل رقم مرسل: 10 رسائل/دقيقة عبر `rate_limit_buckets` الموجود.

**بدون تغيير:** Brain Kernel نفسه، فقط تسجيل agent + tool جديد.

---

## المرحلة D — الناشر التلقائي (Social Autopilot)

1. **قرار مزوّد:**
   - Facebook: Meta Graph API (يتطلب Page Access Token + App Review).
   - Twitter/X: API v2 (paid tier).
   - WhatsApp broadcast: نفس مزوّد المرحلة C.
2. **Migration:** جدول `social_post_schedule` (cron_expr, channel, prompt_template, is_active, last_run_at).
3. **Server route** `src/routes/api/public/social-autopilot-tick.ts`:
   - محمي بـ `cron-auth` middleware (apikey header).
   - يقرأ الجدولة المستحقة → يستدعي Kernel لتوليد نص → ينشر عبر HTTP API للمزوّد → يسجّل في `social_posts`.
4. **pg_cron:** كل ساعة تفحص `social_post_schedule`؛ نقطة الجدولة الفعلية داخل الجدول (لا نُثبّت "9ص Aden" في cron، بل في `cron_expr` لكل مهمة).
5. **UI admin** `src/routes/_authenticated/admin/social-autopilot.tsx`: إدارة القوالب + معاينة قبل النشر + تشغيل يدوي.

**بدون تغيير:** بنية pg_cron الحالية، `ai_events`, `agent_runs`.

---

## قواعد التنفيذ (لكل مرحلة)

- **Rule 1:** قبل أي كود، قراءة الجداول/السياسات الحقيقية بـ `supabase--read_query`.
- **Rule 2:** commit واحد لكل مرحلة، لا خلط.
- **Rule 3:** Regression: `tsgo` + الاختبارات الحالية يجب أن تمر.
- **Rule 4:** تحديث `WAVE-C7-REGRESSION-LOG.md` + `RELEASE-GATE.md` بعد كل مرحلة.
- **Secrets:** لن أطلب أي مفتاح إلا لحظة الحاجة الفعلية (C يحتاج مزوّد واتساب، D يحتاج Meta tokens).

## ترتيب التنفيذ الموصى به

`R1.2 → A → B → (قرار مزوّد C) → C → (قرار مزوّد D) → D`

كل مرحلة تنتظر GO صريح منك قبل الانتقال للتالية. أبدأ بـ **R1.2** فور موافقتك.
