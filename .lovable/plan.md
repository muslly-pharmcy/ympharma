# مراجعة البروميت الشامل مقابل الوضع الحالي

بعد فحص المشروع، **معظم ما في البروميت منفّذ مسبقاً**. لا داعي لإعادة كتابة الملفات الموجودة. فيما يلي الفجوات الحقيقية فقط.

## ما هو منفّذ بالفعل (تجاوز)

| البند | الملف الموجود |
|---|---|
| ErrorBoundary | `src/components/ErrorBoundary.tsx` ✅ |
| useWhatsAppAgent hook | `src/hooks/use-whatsapp-agent.ts` ✅ (يستخدم server fn مع `requireSupabaseAuth` — أفضل من fetch المباشر في البروميت) |
| اختبارات بوت واتساب | `src/lib/__tests__/whatsapp-ai-agent.test.ts` ✅ (7 اختبارات) |
| صفحة مراقبة Cron | `src/routes/admin-cron-jobs.tsx` ✅ + `admin-cron-health.tsx` |
| RPCs (`admin_list_cron_jobs`, `admin_list_cron_runs`, `monitor_cron_failures`) | migration `20260622230645...` ✅ |
| whatsapp-config + الأرقام المسموحة | `src/lib/whatsapp-config.ts` ✅ |
| الصيدلي الصوتي / التوصيات / تحليل المشاعر | hooks و server fns موجودة ✅ |
| social connectors | `src/lib/social-connectors/*` ✅ |

## فجوات تستحق التنفيذ

1. **نقطة `/api/public/whatsapp-agent`** — البروميت يفترض وجود endpoint يستدعيه hook خارجي، لكن hook الحالي يستخدم server function مباشرة. **لا حاجة لإضافتها** ما لم يطلب المستخدم نسخة قابلة للاستدعاء من خارج الموقع.

2. **PageTransition + AnimatePresence في `__root.tsx`** — غير منفّذ. هذا تغيير UX اختياري.

3. **اعتمادية `framer-motion`** — تحتاج تثبيت لو فُعّل PageTransition.

## ملاحظات تقنية على البروميت (أخطاء فيه)

- `process.env.SUPABASE_PUBLISHABLE_KEY` داخل المتصفح في كود البروميت لن يعمل — يجب `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` (الكود الحالي صحيح بالفعل).
- جدول `notifications` يستخدم `body` وليس `message` (الـ migration الحالي يتعامل مع ذلك).
- إعادة كتابة `__root.tsx` كما في البروميت ستحذف منطقاً موجوداً (head, providers, auth listener).
- `LOVALBE_API_KEY` في قسم env البروميت خطأ إملائي.

## اقتراح النطاق

نظراً لأن **كل البنود الجوهرية مُنفّذة**، أقترح **عدم تنفيذ شيء** ما لم تختر أحد التالي:

- **أ)** إضافة `PageTransition` + `framer-motion` لمؤثرات انتقال الصفحات فقط.
- **ب)** إضافة endpoint عام `/api/public/whatsapp-agent` (مع تحقق توقيع/مفتاح) للسماح باستدعاء البوت من خارج الموقع.
- **ج)** لا تغييرات — المشروع مكتمل ومطابق للبروميت فعلياً.

أيّ خيار تريد؟
