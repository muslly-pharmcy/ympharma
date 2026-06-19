# تقرير تنفيذي وتقني — صيدلية المصلي
**التاريخ:** 2026-06-19
**المُعِدّ:** فريق وكلاء AI (CEO + CTO + الوكلاء 1-10)

---

## 1) Business Health Score: **78 / 100**

البنية التحتية صلبة، الحماية محكمة، الأداء محسّن لشبكة اليمن.
الانتقاص الرئيسي: لا يوجد كتالوج منتجات في قاعدة البيانات (المنتجات ثابتة في الكود)، لا توجد حملات بريد فعلية، ولا قياسات تحويل (analytics) بعد.

---

## 2) لقطة الواقع (Live Snapshot)

| المؤشر | القيمة |
|---|---|
| الطلبات | 11 (1 قيد المعالجة) |
| الروشتات | 1 (0 معلّقة) |
| المنتجات في DB | **0** ⚠️ |
| الأخطاء (7 أيام) | 5 |
| حوادث Uptime مفتوحة | 0 ✅ |
| أعضاء الإدارة | 1 admin + 1 owner |
| ملفات Storage | 0 (نظيف بعد التنظيف) |
| البريد المُرسَل (7 أيام) | 0 |

---

## 3) Top 5 Critical / High Issues

### 🔴 CRITICAL-1 — Stack overflow في `/admin-diagnostics` (تم الإصلاح ✅)
- **Root Cause:** `supabase.removeChannel()` داخل `subscribe()` callback يُطلق حدث `CLOSED` يستدعي نفس الـ callback، فيكرّر `removeChannel` حتى تنفد الذاكرة.
- **Risk:** HIGH — تجميد تبويب المتصفح، فقدان جلسة الإدارة.
- **Business Impact:** عدم قدرة المالك على تشخيص النظام.
- **Technical Impact:** `Maximum call stack size exceeded` يُغرق `error_logs`.
- **Fix:** علم `done` يمنع إعادة الدخول قبل أي `removeChannel`.
- **Status:** ✅ مُطبَّق في هذا الرد (`src/routes/admin-diagnostics.tsx`).

### 🟠 HIGH-2 — كتالوج المنتجات في الكود وليس في DB
- **Root Cause:** `src/lib/products.ts` ثابت؛ جدول `products` فارغ.
- **Business Impact:** تعديل الأسعار/المخزون يتطلب نشر جديد. لا توجد إحصاءات بيع لكل منتج. وكيل المخزون والمبيعات (Agent 1, 4) لا يستطيعان العمل.
- **Recommended Fix:** نقل المنتجات إلى DB + لوحة إدارة CRUD (موجودة جزئياً في `admin-products.tsx`).
- **Priority:** HIGH (مرحلة منفصلة بعد موافقتك).

### 🟠 HIGH-3 — البريد الإلكتروني غير مُفعَّل فعلياً
- **Root Cause:** `email_send_log` فارغ خلال 7 أيام؛ لا يوجد transactional يُرسَل.
- **Business Impact:** لا تأكيد طلب، لا تذكير بروشتة، لا استرداد عربة.
- **Fix:** ربط Resend/SES + ربط أحداث الطلب بـ `enqueue_email`.
- **Priority:** HIGH.

### 🟡 MEDIUM-4 — لا توجد لوحة منتجات/مخزون متصلة بمصدر بيانات حي
- نتيجة مباشرة لـ HIGH-2.

### 🟡 MEDIUM-5 — لا مراقبة شاملة (no analytics)
- لا Plausible/Umami/GA؛ لا قياس conversion، bounce، أو heat على صفحة الروشتة.
- **Fix:** إضافة Plausible self-hosted أو Cloudflare Web Analytics (مجاني، صديق للخصوصية، يعمل على شبكات بطيئة).

---

## 4) Top 5 Revenue Opportunities

1. **WhatsApp Re-engagement** — قاعدة الـ11 عميلاً السابقة → رسالة "عرض حصري لعملائنا الأوائل" → متوقع 2-3 طلبات إضافية.
2. **Bundles**: روشتة + فيتامينات → خصم 8% (الـAI agent يقترح تركيبات بعد تجميع 50+ طلب).
3. **Cross-sell عند الدفع**: "العملاء الذين طلبوا X طلبوا أيضاً Y" — يتطلب HIGH-2 أولاً.
4. **عروض الحرارة** (Cooling): بعد إدخال المنتجات، عروض موسمية للأدوية الصيفية (ORS، واقي شمس، كريم حروق).
5. **برنامج ولاء بسيط** بـ "كود إحالة" يُولَّد لكل طلب يصرف منه العميل ≥ 5000 ر.ي.

---

## 5) System Health — CTO Report

| المنطقة | الحالة | ملاحظة |
|---|---|---|
| الأمان (RLS + Storage Policies) | ✅ | 11 SECURITY DEFINER داخلية مُحصَّنة |
| قاعدة البيانات | ✅ | 13 فهرس جديد، RLS مفعّل على كل الجداول |
| Storage | ✅ | نظيف، سياسة `uploads/rx-*/...` صارمة |
| الشبكة (YemenNet) | ✅ | SW + Tajawal مُحلِّي + preconnect + retry تكيّفي |
| Realtime | ✅ | بعد إصلاح stack overflow |
| Uptime | ✅ | 0 incidents مفتوحة |
| البريد | ⚠️ | broker جاهز لكن غير مُستخدَم |
| Analytics | ❌ | غير مُركَّب |
| الإيميل التلقائي للأحداث | ❌ | لا تنبيهات للأدمن عند روشتة جديدة |

---

## 6) Recommended Actions — الأولوية

| # | الإجراء | الأولوية | المُلكية |
|---|---|---|---|
| 1 | ربط Plausible/Cloudflare Web Analytics | MEDIUM | تقني (10 دقائق) |
| 2 | إيميل تنبيه أدمن عند روشتة جديدة | HIGH | تقني (موجود بنية البريد) |
| 3 | نقل المنتجات إلى DB + إدارة مخزون | HIGH | منتج (مرحلة منفصلة) |
| 4 | تفعيل تنبيه WhatsApp Business عند روشتة | MEDIUM | بنية الـtemplate جاهزة |
| 5 | إعداد UptimeRobot للنطاق الإنتاجي | HIGH | يدوي (المالك) |
| 6 | تنفيذ Cloudflare Page Rules من `docs/cloudflare-setup.md` | HIGH | يدوي (المالك) |

---

## 7) المخاطر الاستراتيجية

- **تركّز السلطة**: مالك واحد + أدمن واحد → bus factor = 1. أضف admin إضافي.
- **اعتماد على WhatsApp فقط**: لو تعطّلت WhatsApp Cloud API، تنقطع قناة التواصل الوحيدة. أضف SMS fallback (Twilio أو موفّر يمني).
- **لا قياس تحويل**: نقرّر تحسينات بدون بيانات.

---

## 8) ما تم تنفيذه في هذه الجلسة (الجلسة الكاملة)

- ✅ تحصين الروشتات (مسودة + retry + verify + idempotent insert).
- ✅ حماية أمنية: REVOKE EXECUTE على 11 دالة داخلية + مسار `uploads/` الصارم.
- ✅ تحسين شبكة اليمن: SW + Tajawal محلّي + preconnect + ضغط تكيّفي.
- ✅ أداء DB: 13 فهرس جديد.
- ✅ تنظيف ملف يتيم في Storage.
- ✅ إصلاح bug stack overflow في `admin-diagnostics`.
- ✅ توثيق جاهزية الإنتاج.
