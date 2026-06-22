# 🎯 الخطة المقترحة — تنفيذ الفجوات الفعلية فقط

## ✅ ما هو مُنفّذ بالفعل (سنتخطّاه)

| البند | الملف الموجود | الحالة |
|---|---|---|
| المسار 3 — pg_cron + مراقبة الفشل + RPCs | migration `20260622230645_*` | منفّذ بالكامل |
| صفحة مراقبة المهام | `src/routes/admin-cron-jobs.tsx` | منفّذة (موقعها الحالي يعمل عبر `AdminGate`) |
| Hooks `run-reactivation` / `run-loyalty-reminder` / `run-restock-alerts` | موجودة في `src/routes/api/public/hooks/` | تعمل |
| توصيات شخصية | `src/lib/recommendations.functions.ts` (+ `recommendations-dynamic`) | موجودة |
| تحليل مشاعر عربي عبر Gemini | `src/lib/sentiment.functions.ts` | موجود |
| Voice pharmacist hook | `src/hooks/use-voice-pharmacist.ts` | موجود ويغطّي معظم تحسينات البروميت |

**لن أُعيد إنشاء هذه الملفات أو أُنشئ بدائل مكرّرة** (مثل `sentiment-analysis.server.ts` أو `ai-recommendations.server.ts`)، لأن ذلك سيؤدي إلى تضارب وازدواجية. أيّ تحسين على هذه القطع يكون **تعديلًا داخل الملفات القائمة**.

## 🧩 الفجوات الفعلية التي سأُنفّذها

### 1) `src/components/ErrorBoundary.tsx` (جديد)
- Class component مع `getDerivedStateFromError` / `componentDidCatch`.
- Fallback يستخدم `Alert` + `Button` من shadcn، نصّ عربي RTL، زر "تحديث الصفحة".
- يسجّل الخطأ في `console.error` فقط (بدون Sentry — غير مُركّب في المشروع).
- يُلفّ التطبيق داخل `src/routes/__root.tsx` حول `<Outlet />` (مع الإبقاء على بقية المحتوى كما هو).

### 2) `src/hooks/use-whatsapp-agent.ts` (جديد)
- يدير `messages`, `isLoading`, `error`, `sendMessage`, `clearMessages`, `clearError`.
- يستخدم `AbortController` لإلغاء الطلبات السابقة.
- **سيستدعي server function موجودة** (`runWhatsAppAgent` عبر `useServerFn`) بدلاً من endpoint وهمي `/api/public/whatsapp-agent` غير الموجود في المشروع. سأتحقق من الاسم الفعلي قبل الربط.

### 3) `src/lib/__tests__/whatsapp-ai-agent.test.ts` (جديد)
- 7 اختبارات Vitest تغطّي: `search_product`, `check_stock`, `list_most_available`, `request_create_order`, `receive_location`, `help`, `blocked`.
- Mock لـ `@/integrations/supabase/client.server`.
- سأقرأ `src/lib/whatsapp-ai-agent.server.ts` أولًا لمطابقة التوقيع الفعلي للدالة وأسماء الـ intents حتى لا تفشل الاختبارات.

## 🛠️ تفاصيل تقنية مهمة

- **التبعيات**: `vitest` و`date-fns` و`sonner` مُركّبة بالفعل (مستخدمة في `admin-cron-jobs.tsx`). لن أضيف شيئًا إلا إذا كشف الفحص نقصًا فعليًا (مثل `@testing-library/react`).
- **مخالفات في البروميت المُلصق سأتجاهلها**:
  - `notifications.message` غير موجود — العمود الصحيح `body` (مُستخدَم بالفعل في migration الحالية).
  - `current_setting('app.project_domain')` غير مُهيّأ في المشروع — Hooks الحالية بالفعل تستدعي عبر URL ثابت.
  - `process.env.SUPABASE_PUBLISHABLE_KEY` في كود متصفّح خطأ — الصحيح `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` (مستخدَم بالفعل في `admin-cron-jobs.tsx`).
- **لا migrations جديدة** — كل ما يخصّ pg_cron مُنفّذ.

## 📦 الملفات التي ستتغيّر

| ملف | نوع |
|---|---|
| `src/components/ErrorBoundary.tsx` | جديد |
| `src/hooks/use-whatsapp-agent.ts` | جديد |
| `src/lib/__tests__/whatsapp-ai-agent.test.ts` | جديد |
| `src/routes/__root.tsx` | تعديل بسيط (لفّ بـ ErrorBoundary) |

## ❓ تأكيد قبل البناء
هل توافق على هذا النطاق المُقلَّص (3 ملفات جديدة + تعديل `__root.tsx`)، مع تجاوز كل ما هو منفّذ مسبقًا؟ أم تريدني أيضًا أن أُحدّث ملفات موجودة (`sentiment.functions.ts`, `recommendations.functions.ts`, `use-voice-pharmacist.ts`) بتحسينات إضافية من البروميت؟