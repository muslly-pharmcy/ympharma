
# Reality Check + Wave R1.3 Plan

## 1. لماذا لن أنفّذ مقتطف "Unified Broadcast Engine" كما هو

المقتطف الأخير يحمل توقيع "AI مساعد" لا يعرف مشروعنا. الأخطاء الجوهرية:

- `import { createServerFn } from '@tanstack/start'` — مشروعنا يستخدم `@tanstack/react-start`.
- `requireSupabaseAuth()` **middleware** لا يُستدعى كدالة داخل الـ handler؛ يجب تسلسله عبر `.middleware([requireSupabaseAuth])`.
- استيراد وهمي: `@/lib/auth/guards.server` غير موجود، و `brainKernel.generate(...)` غير موجود — الموجود فعلياً هو `dispatch(actor, ...)` في `src/lib/ai/runtime/kernel.server.ts` ويتطلب `Actor` مع `organizationId` و `correlationId`.
- `Buffer.from(...)` في Worker runtime — يعمل مع `nodejs_compat` لكن الأنقى استعمال `btoa` أو `TextEncoder`.
- Facebook/Meta و WhatsApp عبر Twilio: **لا توكنات محفوظة حالياً** — لا `TWILIO_ACCOUNT_SID` ولا `FB_PAGE_ACCESS_TOKEN` في الأسرار. أي كود إرسال الآن سيرمي `Missing …` في الإنتاج.
- `To: 'whatsapp:+967XXXXXXXXX'` رقم Placeholder — سنكسر تسليم الرسائل.
- كود الـ Header يحتوي HTML entity artifacts (كتلة JSX منقوصة) ولن يُترجم أصلاً.

**الاستنتاج:** نعتمد توصيتك الحقيقية في نفس الرسالة — إغلاق R1.3 و R1.4 أولاً، وتأجيل Tracks B/C حتى وصول مفاتيح Meta/Twilio.

## 2. Wave R1.3 — Authorization & Tenant Audit (النطاق المعتمَد)

**الهدف:** الإجابة عن سؤال "المستخدم مصادق، لكن هل مخوّل لهذه البيانات؟" لكل واحدة من الـ 150 دالة المحمية.

### التسليمات
1. **`scripts/audit-authorization.mjs`** — تحليل ثابت لكل `*.functions.ts` يستخرج لكل دالة:
   - وجود `.middleware([requireSupabaseAuth])`.
   - هل تستخدم `context.supabase` (RLS-scoped) أم `supabaseAdmin` (bypass RLS)؟
   - هل يوجد `organization_id` filter صريح في الاستعلام؟
   - هل تعتمد فقط على RLS، أم على فحص دور (`context.claims`, `has_role`) أيضاً؟
2. **`docs/engineering/WAVE-R1.3-AUTHZ-AUDIT.md`** — جدول قرار لكل دالة بالحالات:
   - ✅ RLS-only (السياسة تكفي — موثّق أي جدول/سياسة).
   - ✅ RLS + role check (least-privilege موثّق).
   - ⚠️ Admin bypass legitimate (مبرَّر — trigger/migration/DLQ).
   - ❌ Tenant leak risk (تصحيح مطلوب).
3. **إصلاحات موضعية فقط** للفئة ❌ (سنطرحها في PR منفصل بعد المراجعة، لا في هذه الموجة).

### حدود صارمة (Non-Goals لهذه الموجة)
- لا تعديل مخطط قاعدة البيانات.
- لا تغيير على منطق أعمال أو UI.
- لا يُعاد كتابة أي دالة إلا لسدّ تسرّب مؤكَّد (وسيُذكر منفصلاً في التقرير).

## 3. الخطوة التالية بعد R1.3
- **R1.4 — Contract Audit** (Zod, error taxonomy, correlation IDs, idempotency, pagination) عبر نفس منهجية السكربت الثابت.
- Tracks B/C يبقيان معلَّقَين حتى يضع Chief التوكنات (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`) عبر Lovable Secrets — عندها سنفتحهما بتصميم Webhook-first كما اقترحت.

**الطلب:** اعتمد Wave R1.3 بهذا النطاق لأبدأ التنفيذ مباشرة.
