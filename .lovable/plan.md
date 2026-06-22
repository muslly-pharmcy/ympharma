# خطة الميزات المتقدمة الأربع — مع تحفظات مهمة

## ⚠️ تحفظات على البروميت قبل التنفيذ

البروميت كُتب بافتراضات لا تطابق منصة Lovable والمشروع الحالي. يجب تعديلها:

### 1) نظام الفواتير
- **مشكلة**: البروميت يستخدم `Resend` كحزمة npm مباشرة. على Lovable، البريد يُرسل عبر **Lovable Emails / connector gateway** (لا تحتاج مفتاح من المستخدم).
- **مشكلة**: جدول `invoices` غير موجود. يحتاج migration كامل (مع `GRANT` + RLS).
- **مشكلة**: البروميت يقرأ من جدول `settings` و`orders.items` و`orders.user_phone`/`user_email` — لا شيء من ذلك موجود في schema الحالي. جدول `orders` لديه 14 عمود فقط ولا يوجد `settings`. يجب التحقق من الأعمدة الفعلية أولاً.
- **مشكلة**: استخدام `prompt()`/`alert()` للـ UX — يُستبدل بـ shadcn Dialog + `sonner`.
- **الحل المقترح**: إنشاء جدول `invoices`، توليد HTML من بيانات الطلب الحقيقية، طباعة عبر `window.print()`، إرسال عبر Lovable Emails (لا Resend SDK).

### 2) بوابة دفع PayTabs
- **مشكلة كبيرة**: Lovable لديها **مدفوعات مدمجة (Paddle / Stripe)** بدون مفاتيح. PayTabs غير مدعومة كـ connector وتحتاج 3 أسرار يدوية + webhook حقيقي + تحقق توقيع.
- **اليمن**: PayTabs لا تعمل في اليمن (دول الخليج فقط). Stripe كذلك لا يدعم اليمن كحساب بائع.
- **بديل واقعي**: 
  - (أ) **الدفع عند الاستلام (COD)** — الأنسب لليمن، بدون تكامل خارجي.
  - (ب) **تحويل بنكي / محفظة محلية يدوي** (رفع إيصال) + تأكيد إداري.
  - (ج) إذا أصر على بوابة، يحتاج تزويدي بمفاتيح PayTabs/MyFatoorah/Telr عبر `add_secret`.

### 3) تقارير متقدمة
- **مشكلة**: البروميت يفترض `orders.items` JSON. التحقق مطلوب. لو الطلبات في جدول `order_items` منفصل، الكود يتغير.
- **مشكلة**: `orders.total` و`status='delivered'` — يجب التحقق من قيم status الموجودة.
- **الحل المقترح**: قراءة schema فعلياً، بناء server fn `getSalesReport` + تصدير CSV (يعمل في المتصفح بـ Blob)، صفحة `/admin-sales-reports` مع Recharts.

### 4) تطبيق موبايل Hybrid (Capacitor)
- **مشكلة جوهرية**: المشروع **TanStack Start بـ SSR على Cloudflare Workers** — لا يبني إلى `dist/` ساكن يمكن تغليفه بـ Capacitor مباشرة. Capacitor يتوقع SPA static.
- **مشكلة**: الـ Service Worker اليدوي ممنوع في Lovable preview (يكسر المعاينة). يجب اتباع `vite-plugin-pwa` مع حراسات.
- **موجود مسبقاً**: `public/sw.js`, `public/manifest.webmanifest`, `ANDROID.md`, `twa-manifest.json`، `public/.well-known/assetlinks.json` — المشروع يستخدم **TWA (Trusted Web Activity)** وليس Capacitor، وهو الخيار الصحيح لـ TanStack Start.
- **التوصية**: عدم إدخال Capacitor. الإبقاء على TWA الموجود. لو يريد PWA فقط، تحسين الـ manifest والـ install prompt.

---

## 📋 الخطة المقترحة (نطاق واقعي)

سأنفذ ما هو **متوافق مع المنصة وقاعدة البيانات الحالية**:

### المرحلة 1 — الفواتير (واقعية)
1. **Migration**: جدول `invoices` (id, order_id FK, html_content, total, status enum: draft/sent/paid, sent_at, created_at, updated_at) + GRANT + RLS (admin يقرأ/يكتب، المستخدم يقرأ فاتورته فقط).
2. `src/lib/invoices.functions.ts`:
   - `createInvoice({orderId})` — يقرأ من `orders` بالأعمدة الفعلية (سأتحقق منها أولاً)، يولد HTML RTL، يحفظ.
   - `sendInvoiceEmail({invoiceId, email})` — يستخدم Lovable Emails عبر connector gateway. سأتأكد أن connector `resend` أو email موصول، وإلا أوجه المستخدم.
3. `src/components/InvoiceViewer.tsx`: shadcn Dialog + زر طباعة (`window.print` في iframe) + زر إرسال (Dialog إدخال بريد).
4. زر "إنشاء فاتورة" في `admin-orders` (أو `OrdersTab`).

### المرحلة 2 — الدفع (واقعية لليمن)
1. **Migration**: جدول `payment_transactions` (id, order_id, method enum: cod/bank_transfer/wallet, amount, currency, status, receipt_url, notes, created_at) + GRANT + RLS.
2. صفحة في checkout: اختيار طريقة دفع (COD / تحويل بنكي مع رفع إيصال إلى Supabase Storage).
3. `admin-payments.tsx`: مراجعة وتأكيد المدفوعات اليدوية.
4. **لن أربط PayTabs** ما لم يطلب صراحة ويزود مفاتيحه.

### المرحلة 3 — تقارير المبيعات
1. أتحقق من schema `orders` و`order_items` الفعلي.
2. `src/lib/sales-reports.functions.ts`: `getSalesReport({startDate, endDate, groupBy})`، `getTopProducts`، `exportSalesCSV` (يُرجع نص CSV، التحميل يتم في المتصفح).
3. صفحة `/admin-sales-reports` مع: KPI cards + Recharts (Line للإيرادات، Bar لأكثر المنتجات) + DateRangePicker + زر تصدير CSV.

### المرحلة 4 — تطبيق الموبايل
- **لا Capacitor**. سأكتفي بـ:
  - مراجعة `public/manifest.webmanifest` وتأكيد جودته للتثبيت على الشاشة الرئيسية.
  - `src/components/InstallPrompt.tsx`: بانر تثبيت PWA (beforeinstallprompt) مع حراسة preview Lovable حسب `skill/pwa`.
  - **TWA موجود مسبقاً** عبر `twa-manifest.json` و`assetlinks.json` — لن أكسره.
- لو المستخدم يصر على Capacitor، يجب نقل التطبيق إلى SPA كلياً (تغيير معماري كبير) — سأطلب موافقة منفصلة.

---

## ❓ أحتاج قراراتك قبل البدء

1. **البريد**: هل أستخدم Lovable Emails المدمج (موصى به)، أم لديك حساب Resend خاص تريد ربطه عبر connector؟
2. **الدفع**: هل توافق على **COD + تحويل بنكي يدوي** (الأنسب لليمن)، أم تريد PayTabs/MyFatoorah فعلاً (وستزودني بالمفاتيح)؟
3. **النطاق**: هل أنفذ **المراحل الأربع كلها** الآن، أم نبدأ بمرحلة واحدة (مثلاً الفواتير) ونكمل البقية لاحقاً؟ نطاق الأربع كبير ويحتاج 3–4 migrations و~12 ملف جديد.
4. **التطبيق**: هل تقبل الإبقاء على **TWA الحالي + PWA install prompt**، أم تصر على Capacitor (يتطلب إعادة هيكلة)؟

أجبني على هذه النقاط وسأقدّم خطة نهائية مفصلة للتنفيذ في build mode.
