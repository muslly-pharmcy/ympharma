# قائمة جاهزية الإنتاج — صيدلية المصلي

آخر تحديث: 2026-06-19 — بعد المرحلتين 4 و8.

## 1) الأمان (مكتمل ✅)
- RLS مفعّل على كل جداول `public` مع `GRANT` صريح.
- أدوار المستخدمين في جدول `user_roles` منفصل + `has_role()` SECURITY DEFINER.
- `REVOKE EXECUTE` على 11 دالة داخلية (`enqueue_email`, `delete_email`, `read_email_batch`, `move_to_dlq`, `create_scheduled_backup`, `run_retention_policy`, `check_img_rate_limit`, `log_table_activity`, `trim_img_proxy_logs`, `record_order_status_change`, `touch_updated_at`).
- سياسات تخزين الروشتات: مسار `uploads/rx-*/...` فقط.
- التحذيرات الـ13 المتبقية من Linter متعمدة (دوال عامة تتحقق من الصلاحيات داخلياً).

## 2) موثوقية الروشتات (مكتمل ✅)
- مسودة + قائمة انتظار في localStorage (`rx-pending.ts`).
- إعادة محاولة exponential backoff + jitter (`net-retry.ts`).
- تحقق HEAD بعد الرفع.
- Idempotent insert (refId).
- شريط استرداد عند فتح الصفحة لاحقاً.

## 3) شبكة اليمن (مكتمل ✅)
- Self-hosted Tajawal (لا Google Fonts CDN).
- Service Worker لتشغيل offline.
- `net-quality.ts` يكتشف 2g/3g/4g + saveData ويعدّل الضغط ديناميكياً.
- `preconnect` لـ Supabase Storage + `dns-prefetch` لـ wa.me و Unsplash.
- Cloudflare CDN أمام Lovable (موثّق في `docs/cloudflare-setup.md`).

## 4) الأداء (مكتمل ✅)
- 13 فهرس على الأعمدة الساخنة (status, created_at, message_id, إلخ).
- ضغط صور تكيّفي على العميل.
- Lazy-load للـ widgets (AI chat, SW banner).
- Cache-Control عبر Cloudflare Page Rules.

## 5) جاهزية الإنتاج — قبل الإطلاق
- [ ] تأكيد DNS عبر Cloudflare (`dig +short muslly.com` يعطي IP من Cloudflare).
- [ ] SSL/TLS = Full (Strict) في Cloudflare.
- [ ] UptimeRobot يراقب `/api/public/health` كل 5 دقائق.
- [ ] تشغيل اختبارات `vitest` قبل كل deploy.
- [ ] التحقق من `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` صالحين.
- [ ] مراجعة لوحة الإدارة `/admin` بعد كل نشر للتأكد من ظهور الروشتات والطلبات.
- [ ] backup يومي مفعّل (`create_scheduled_backup('daily')` عبر pg_cron).
- [ ] تشغيل `run_retention_policy()` أسبوعياً لتنظيف السجلات القديمة.

## 6) خطوات يتولّاها المالك يدوياً
- ربط النطاق المخصص في Lovable.
- ضبط Page Rules في Cloudflare (انظر `docs/cloudflare-setup.md`).
- إضافة UptimeRobot Webhook إلى `/api/public/uptime-webhook`.
- مراجعة المستخدمين والأدوار من `/admin` → Staff Tab.

## 7) سياسات الاحتفاظ الافتراضية
- `error_logs`: 30 يوم → أرشيف 180 يوم.
- `uptime_incidents`: 60 يوم → أرشيف 365 يوم.
- `uptime_checks`: 14 يوم.
- النسخ الاحتياطي: 14 يومية + 8 أسبوعية + 30 يدوية.
