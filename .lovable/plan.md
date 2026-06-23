## الهدف
تحسين تشخيص ومراقبة تكامل n8n في لوحة `/admin-social-posts` عبر سجلات أوضح، تفاصيل HMAC/payload، وردود ping محسّنة.

## التغييرات

### 1) Migration: توسيع `social_post_attempts`
إضافة أعمدة تشخيصية:
- `request_payload JSONB` — الـ payload المرسل لـ n8n
- `response_status INTEGER` — HTTP code من n8n
- `response_body TEXT` — أول 1000 حرف من رد n8n
- `hmac_valid BOOLEAN` — نتيجة التحقق من HMAC (للسجلات الواردة من callback)
- `idempotent_skip BOOLEAN` — هل تم رفض التكرار

### 2) `src/routes/api/public/hooks/social-callback.ts`
- تسجيل كل استدعاء callback في `social_post_attempts` (حتى المرفوضة) مع: `hmac_valid`, `request_payload`, `idempotent_skip`, وسبب الرفض في `error_message`.
- `console.log` مفصّل: `[social-callback] post_id=… event=… external_id=… hmac=ok/fail reason=…`
- عند رفض التكرار: تسجيل سطر يوضح القيم الموجودة مقابل الواردة.

### 3) `src/lib/social-publisher.server.ts`
- تخزين `request_payload` + `response_status` + `response_body` عند كل محاولة نشر (نجاح/فشل).

### 4) `src/lib/social.functions.ts`
- `pingN8nWebhook`: تحسين الرد ليتضمن `headers` المهمة و`durationMs` ورد كامل (حتى 1500 حرف بدل 400). ترجع `errorDetail` منفصلة عن `body`.
- `listPostAttempts`: إضافة الحقول الجديدة للنتيجة.

### 5) `src/routes/admin-social-posts.tsx`
- بطاقة المنشور: عرض `attempt_no` آخر محاولة و`last_error` في صدر البطاقة بشكل بارز (badge أحمر للأخطاء).
- زر "إعادة المحاولة" يستخدم `publishPostNow` نفسه (يحترم idempotency تلقائياً عبر external_id الموجود).
- في `AttemptsDialog`:
  - عمود "HMAC" مع ✅/❌ لكل callback
  - زر توسيع يعرض `request_payload` كـ JSON منسق
  - عرض `response_status` و`response_body`
  - شارة "تم تخطيه (تكرار)" للسجلات `idempotent_skip=true`
- زر "اختبار n8n": عند الفشل عرض dialog تفصيلي بدل toast قصير، يحتوي على: HTTP code، URL، body كامل، duration، error message.

### تفاصيل تقنية
- لا تغيير في عقد n8n الخارجي — فقط تسجيل إضافي محلي.
- جميع الحقول الجديدة optional/nullable حتى لا تكسر السجلات القديمة.
- `request_payload` لا يحتوي على أسرار (فقط محتوى المنشور).

## ملفات ستتغير
- migration جديدة لتوسيع `social_post_attempts`
- `src/routes/api/public/hooks/social-callback.ts`
- `src/lib/social-publisher.server.ts`
- `src/lib/social.functions.ts`
- `src/routes/admin-social-posts.tsx`
