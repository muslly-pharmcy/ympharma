# خطة تفعيل واختبار قنوات التنبيهات

## 1. إعداد الأسرار (مطلوب منك)
- **Slack**: سأطلب منك إضافة `SLACK_WEBHOOK_URL` عبر النافذة الآمنة. تحصل على الرابط من: Slack → Apps → Incoming Webhooks → اختر القناة (مثل `#alerts`) → نسخ Webhook URL.
- **Twilio**: سأشغّل `standard_connectors--connect` لاختيار/ربط Twilio في الـ workspace، ثم أطلب منك `TWILIO_FROM_NUMBER` (رقم Twilio E.164 الذي يرسل، مثل `+12025551234`).
- **WhatsApp**: جاهز — يستخدم `WHATSAPP_TOKEN` و`WHATSAPP_PHONE_NUMBER_ID` الموجودَين.

## 2. اختبار end-to-end لكل قناة
سأنشئ route مؤقّت `/api/public/hooks/test-alert` (يتطلّب `x-cron-secret`) يستقبل `{ channel: "slack"|"sms"|"whatsapp"|"all", severity }` ويرسل رسالة تجربة دون لمس `alert_dedupe`. ثم:
1. استدعاء بـ `channel=slack` → تأكيد وصول رسالة "TEST" مع زر View Report.
2. استدعاء بـ `channel=sms` → التحقّق من تسليم Twilio (status code + رد JSON).
3. استدعاء بـ `channel=whatsapp` → التحقّق من رد Graph API (200).
4. إضافة مشترك تجربة (رقمك) في `/admin-alert-settings` قبل اختبار SMS/WhatsApp.
5. محاكاة Uptime=0 عبر إدراج `agent_runs` صف `cto` بـ `details.uptime_pct=0`، ثم استدعاء `agent-alerts` الفعلي للتأكّد من التدفّق الكامل (Slack+SMS+WA+Email+ops alert+dedupe).
6. مسح `alert_dedupe` للسطر التجريبي بعد التأكّد، وحذف الـ test route.

## 3. مراجعة وضبط العتبات في `/admin-alert-settings`
سأفتح الصفحة لعرض القيم الحالية (الافتراضيات بعد آخر هجرة):
- Uptime: 50% — اقترح رفعها إلى 80% للحساسية الأعلى.
- النمو: −25% — اقترح −15% للإنذار المبكر.
- الطلبات المتأخرة: 5 — اقترح 3.
- الأخطاء/24س: 50 — اقترح 30.

ستختار القيم النهائية والقنوات المفعّلة (Email/Slack/SMS/WhatsApp) قبل الحفظ.

## التفاصيل التقنية

- **route الاختبار** `src/routes/api/public/hooks/test-alert.ts`: يستخدم نفس `sendSlack/sendSms/sendWhatsApp` من `alert-dispatch.server.ts` ويُعيد `{ channel, ok, http_status }` لكل قناة.
- **منع التلوّث**: الاختبار لا يكتب في `alert_dedupe` ولا `operations_alerts_v14`، ولا يدفع لـ pg_cron.
- **التحقّق**: سأستدعي الـ route مباشرة من السندبوكس عبر `curl` للـ stable preview URL مع رأس `x-cron-secret`، وأقرأ السجلات.
- **التراجع**: حذف ملف `test-alert.ts` تلقائياً بعد نجاح الاختبار، أو إبقاؤه خلف توغل `enable_test_endpoint` إن أردت.

## ترتيب التنفيذ
1. `add_secret` لـ `SLACK_WEBHOOK_URL`.
2. `standard_connectors--connect` لـ Twilio + `add_secret` لـ `TWILIO_FROM_NUMBER`.
3. إنشاء `test-alert` route.
4. تشغيل اختبارات القنوات الثلاث وتقرير النتائج.
5. ضبط `alert_settings` بالقيم النهائية (بعد موافقتك).
6. محاكاة Uptime=0 ثم استدعاء `agent-alerts` الحقيقي للتأكّد من التدفّق الكامل.
7. حذف `test-alert` route وتنظيف بيانات الاختبار.
