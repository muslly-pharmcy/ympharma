## الخطة — تكييف blueprint v14.0 على الواقع

الـ blueprint المرسل يعيد إدخال أخطاء صحّحناها (`stock` بدل `stock_qty`، `read_at`/`body`/`data` بدل `read`/`metadata`، `supabase.raw()` غير الموجودة، مسارات `/_authenticated/admin/inventory.tsx` متعارضة). سأطبّق فقط ما يضيف قيمة فعلية دون كسر الموجود.

### ما سيُنفَّذ

**1. `src/lib/slack.functions.ts` (جديد)**
- `isValidSlackWebhookUrl(url)` — regex للتحقق من `https://hooks.slack.com/services/...`.
- `sendSlackMessage({ message })` — يتحقق من `process.env.SLACK_WEBHOOK_URL` قبل الإرسال، يرجع خطأ واضح إذا كانت القيمة غير صالحة (مثل رقم الهاتف الحالي).
- `testSlackWebhook()` — يرجع `{ valid, reason }` بدون كشف الرابط الكامل.
- يستخدم `requireSupabaseAuth` + فحص `has_role(admin)` لمنع إساءة الاستخدام.

**2. `src/components/admin/InventoryAlerts.tsx` (جديد)**
- مكوّن واجهة فقط، يستهلك `getLowStockProducts` الموجود فعلاً في `src/lib/inventory.functions.ts`.
- يعرض الحقول الحقيقية: `stock_qty` و`reorder_point` (وليس الوهمية).
- refetch كل 60 ثانية، حالة فارغة + حالة تحميل + قائمة بطاقات.

**3. `src/routes/_authenticated/admin-slack-test.tsx` (جديد)**
- صفحة صغيرة تستدعي `testSlackWebhook` وتعرض النتيجة + تعليمات الحصول على Webhook صحيح.
- زر لإرسال رسالة اختبار.

**4. تضمين `InventoryAlerts` في صفحة `/admin-inventory` الحالية** (إضافة في الأعلى، بدون تعديل المنطق).

### ما لن يُنفَّذ (ومبرراته الفنية)

| الملف في الـ blueprint | السبب |
|---|---|
| `src/lib/inventory.server.ts` بـ `stock` | العمود الفعلي `stock_qty`؛ النسخة الحالية `src/lib/inventory.functions.ts` تعمل وتمرّ typecheck/tests. |
| `src/lib/notifications.server.ts` بـ `read_at`/`body`/`data` | الأعمدة الفعلية `read` (bool) + `metadata` (jsonb)؛ النسخة الحالية صحيحة. |
| `src/lib/audit.server.ts` على `activity_logs` فقط | لدينا فعلاً `audit_logs_unified` view يجمع 5 جداول (activity_logs + inventory_audit_log + supplier_link_audit + transfer_audit_log + error_logs). |
| `src/components/admin/AdminAudit.tsx` بديل | صفحة `/admin-audit` الحالية تعمل على الـ view الموحّد. |
| migration `add_reorder_threshold.sql` | العمود موجود فعلاً (تأكّدنا في الجلسة السابقة). |
| `src/routes/_authenticated/admin/inventory.tsx` | سيتعارض مع `src/routes/admin-inventory.tsx` المسطّح الموجود. |
| `supabase.raw(...)` | غير موجودة في supabase-js v2 — ستفشل وقت التشغيل. |

### تفاصيل تقنية

- ملفات `.functions.ts` (وليس `.server.ts`) لأن المكوّنات تستوردها — وفق قواعد المشروع.
- `sendSlackMessage` يستخدم `fetch` مباشرة (Workers-compatible).
- لا migration مطلوبة.
- لا تغيير في schema، لا تغيير في الـ tests الناجحة.

### بعد التنفيذ
- typecheck يجب أن يبقى نظيفاً.
- الاختبارات الـ 7 الناجحة سابقاً تبقى ناجحة.
- ستحتاج لاحقاً تحديث قيمة `SLACK_WEBHOOK_URL` يدوياً بالرابط الصحيح؛ صفحة `/admin-slack-test` ستؤكّد متى يصبح صالحاً.
