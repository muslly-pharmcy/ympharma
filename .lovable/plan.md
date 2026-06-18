# خطة تحسين الموثوقية والوصول من شبكات محظورة (يمن نت)

## 1) مراقبة توفر الموقع (Uptime Monitoring)
- إنشاء endpoint صحة عام: `src/routes/api/public/health.ts` يرجع `{ status, db, time }` ويستخدم Supabase publishable client لفحص قاعدة البيانات.
- جدولة فحص داخلي عبر `pg_cron` كل 5 دقائق يستدعي `health` ويسجل النتائج في جدول جديد `uptime_checks(id, checked_at, ok, latency_ms, region, error)`.
- جدول `uptime_incidents(id, started_at, ended_at, severity, summary)` لتتبّع الحوادث.
- تكامل اختياري مع UptimeRobot/BetterStack (مجاني) — يضرب `/api/public/health` من عدة مناطق ومنها الشرق الأوسط؛ Webhook خارجي على `/api/public/uptime-webhook` مع HMAC signature يفتح/يغلق الحوادث تلقائيًا.
- تنبيهات: عند فشل ≥ مرتين متتاليتين، إرسال رسالة WhatsApp للمالك عبر سر `WHATSAPP_TOKEN` الموجود.

## 2) صفحة الحالة `/status`
- صفحة عامة `src/routes/status.tsx` تعرض:
  - الحالة الحالية (تعمل / متدهور / تعطل) من `uptime_checks` آخر 24 ساعة.
  - رسم بياني بسيط لآخر 90 فحص.
  - قائمة الحوادث المفتوحة/المغلقة من `uptime_incidents`.
  - تنبيه خاص بشبكات الحجب (يمن نت): توجيه المستخدم لاستخدام DNS بديل (1.1.1.1 / 8.8.8.8) أو VPN، مع روابط واضحة.
- صفحة fallback ثابتة `public/offline.html` (تُخزَّن في Service Worker لاحقًا) تظهر عند فشل تحميل JS.
- ربط `/status` في تذييل الموقع بجانب `/trust`.

## 3) تجميع سجلات الأخطاء (Client + Server)
- جدول `error_logs(id, occurred_at, level, source [client|server], message, stack, url, user_agent, user_id, extra jsonb)`.
- Server function `logClientError` تتلقى تقارير من المتصفح (rate-limited).
- في `src/routes/__root.tsx`: تثبيت `window.onerror` و `unhandledrejection` و React `ErrorBoundary` لإرسال الأخطاء.
- اعتراض فشل `fetch`/Supabase: wrapper يرصد network failures (`Failed to fetch`, status >= 500) ويسجلها مع معرف المنطقة الجغرافية (من `Accept-Language`/`CF-IPCountry` header إن توفر).
- تبويب في لوحة التحكم `ErrorsTab.tsx` لعرض السجلات والفلترة حسب المصدر/البلد/التاريخ.

## 4) HTTPS و تهيئة البروكسي/CDN
- في الـ root route head: التأكد من `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` عبر `<meta http-equiv>` حيث ممكن (Lovable لا يسمح بتعديل headers الـ Worker مباشرة).
- إنشاء `src/routes/api/public/redirect-check.ts` يتحقق من البروتوكول ويقدم 301 لـ HTTP→HTTPS (Lovable يفرض HTTPS تلقائيًا، لكن نوثق ذلك).
- توثيق إعداد Cloudflare في `docs/cloudflare-setup.md`:
  - SSL Mode: **Full (Strict)**
  - DNS: A `@` → 185.158.133.1 (Proxied 🟠), A `www` → 185.158.133.1 (Proxied 🟠)
  - في Lovable Domain settings: تفعيل خيار **"Domain uses Cloudflare or a similar proxy"** (Advanced) — يتبدل من تحقق A-record إلى CNAME.
  - Page Rules: Always Use HTTPS = On، Automatic HTTPS Rewrites = On.
  - Cache: Bypass cache على `/api/*` و `/_serverFn/*`.
- إضافة معالجة `CF-Connecting-IP` و `CF-IPCountry` في server functions لتسجيل المصدر الفعلي بدل IP الـ proxy.

## تفاصيل تقنية

### جداول جديدة (migration واحدة)
```sql
CREATE TABLE public.uptime_checks (...);
CREATE TABLE public.uptime_incidents (...);
CREATE TABLE public.error_logs (...);
-- GRANTs: anon SELECT على uptime_checks/incidents فقط؛ authenticated INSERT على error_logs
-- RLS: قراءة عامة للحالة، كتابة أخطاء للجميع مع rate limit عبر trigger
```

### الملفات المنشأة/المعدلة
- جديد: `src/routes/status.tsx`, `src/routes/api/public/health.ts`, `src/routes/api/public/uptime-webhook.ts`, `src/routes/api/public/log-error.ts`, `src/lib/error-reporter.ts`, `src/components/admin/ErrorsTab.tsx`, `public/offline.html`, `docs/cloudflare-setup.md`, migration SQL.
- معدّل: `src/routes/__root.tsx` (ErrorBoundary + handlers + security meta), `src/components/site-chrome.tsx` (رابط /status), `src/routes/admin.tsx` (تبويب الأخطاء).

### قيود
- مراقبة من **داخل اليمن** تتطلب خدمة خارجية (UptimeRobot لا يملك probe في اليمن، أقرب: السعودية/الإمارات). الحل الجزئي: استخدام مستخدمين متطوعين عبر سكربت client يبلّغ عن فشل التحميل.
- Lovable لا يسمح بتعديل HTTP response headers على مستوى الـ Worker مباشرة؛ بعض headers الأمان ستضاف عبر Cloudflare Transform Rules (موثقة).
