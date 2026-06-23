# خطة التحقق من تكامل n8n الجديد

## 1. اختبار رابط n8n الجديد (Smoke Test)
- استخدام `stack_modern--invoke-server-function` لاستدعاء endpoint داخلي يستدعي n8n.
- إن لم يكن موجوداً، إضافة server function اختبارية مؤقتة `pingN8n` ترسل payload صغير:
  ```json
  { "event": "ping", "post_id": "test", "platform": "telegram", "caption": "ping" }
  ```
- التحقق من استجابة 200 من n8n وتسجيلها.

## 2. التحقق من إعدادات الـ workflows في n8n
لا يمكن تعديل n8n من داخل Lovable. سأوفّر **checklist** للمستخدم يطبّقها يدوياً:
- في n8n: تأكيد أن مسار Webhook في الـ Production URL يطابق الرابط الجديد المخزّن في `N8N_WEBHOOK_URL`.
- التحقق من Credentials لكل منصة:
  - Facebook: Page Access Token + Page ID صالحان (اختبار `/me/accounts`).
  - Instagram: Business Account ID + Page Token مرتبطان.
  - Twitter/X: Bearer Token أو OAuth 1.0a يعمل مع `POST /2/tweets`.
  - Telegram: Bot Token + Chat ID صحيحان.
- تأكيد أن خطوة الـ Callback تستخدم `N8N_CALLBACK_SECRET` لحساب HMAC وترسل إلى:
  `https://ympharma.lovable.app/api/public/hooks/social-callback`.

## 3. اختبار النشر الفوري من `/admin-social-posts`
- توليد منشور تجريبي عبر زر "توليد الآن" (يستدعي `regenerateDailyPostsNow`).
- الضغط على "نشر الآن" لأحد المنشورات → يستدعي `publishPostNow` → `publishPostById` → POST إلى `N8N_WEBHOOK_URL`.
- مراقبة:
  - سجل `social_post_attempts` (status=success, source=manual).
  - تحديث `social_posts.status` إلى `published` و `external_id` ممتلئ.
- استعلام SQL للتأكيد:
  ```sql
  select id, platform, status, external_id, attempt_count, error_message, last_attempt_at
  from social_posts order by created_at desc limit 5;
  
  select * from social_post_attempts order by created_at desc limit 10;
  ```

## 4. تشخيص الأعراض الحالية (502 Bad Gateway)
network logs تُظهر أن `assertCallerIsAdmin` ترجع 502 من Cloudflare قبل وصول الطلب. هذا قد يمنع فتح صفحة `/admin-social-posts`. سأتحقق:
- إعادة محاولة بعد ~60 ثانية (Cloudflare تطلب `retry_after: 60`).
- إذا استمر، فحص logs الـ server function عبر `stack_modern--server-function-logs`.

## الناتج المتوقع
- تأكيد أن `N8N_WEBHOOK_URL` الجديد يردّ 200.
- منشور واحد على الأقل حالته `published` مع `external_id` في قاعدة البيانات.
- إن فشل أي شيء: رسالة خطأ واضحة من attempts + اقتراح إصلاح (credentials/URL/HMAC).

## ملاحظات تقنية
- لا تغييرات في schema قاعدة البيانات.
- التغيير الوحيد المحتمل في الكود: server function اختبارية `pingN8n` (اختيارية، يمكن حذفها بعد الاختبار).
- لن أعدّل أي workflow في n8n مباشرة — يبقى ذلك مسؤولية المستخدم وفق الـ checklist.
