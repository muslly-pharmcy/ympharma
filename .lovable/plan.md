## Scope

ثلاث مهام منفصلة، كلها متوافقة مع الـ codebase الحقيقي (تم التحقق من الـ schemas عبر psql):

---

### 1) Titans UI — صفحة هبوط جديدة على `/titans`

لتجنّب تدمير `src/routes/index.tsx` الحالي، أبني الصفحة على route مستقل `/titans` يمكن ترقيتها لاحقاً للجذر.

ملفات جديدة:
- `src/routes/titans.tsx` — صفحة هبوط تستخدم الأقسام التالية:
  - `src/components/titans/HeroTitans.tsx`
  - `src/components/titans/FeaturesTitans.tsx`
  - `src/components/titans/PricingTitans.tsx`
  - `src/components/titans/FooterTitans.tsx`
  - `src/components/titans/ui/GradientText.tsx`, `GlassCard.tsx`, `GoldenBorder.tsx`
  - `src/components/titans/motion/Reveal.tsx`, `CountUp.tsx`
- توكنز التصميم (ذهبي/زجاجي/تدرّجات) تُضاف داخل `src/styles.css` تحت `@theme` و`@utility` فقط — لا hardcoded colors في المكوّنات (التزام بـ design-system).
- `framer-motion` موجود مسبقاً في `package.json` — لا تثبيت جديد.
- لا لمس backend أو events أو agents.

`__root.tsx`, `index.tsx`, و event-consumer.ts لن يُعدَّلوا.

---

### 2) Pharmacist Dashboard على `/_authenticated/pharmacist-dashboard`

تم التحقق من schema الحقيقي:
- `agent_approval_requests` يحتوي فعلياً: `status` (pending/approved/rejected/expired), `decided_by`, `decided_at`, `decision_note`, `pharmacist_notes`, `extracted_medicines`, `missing_medicines`, `customer_message`, `payload`. Realtime مفعّل (`supabase_realtime` publication).
- `app_role` enum = `{admin, user, owner}` — **لا يوجد دور "pharmacist"**. الـ RLS يسمح لـ admin/owner فقط بقراءة وتحديث طلبات الموافقة، لذلك الـ dashboard يُقيَّد بهذين الدورين.

ملفات جديدة:
- `src/routes/_authenticated/pharmacist-dashboard.tsx` — صفحة Realtime:
  - تحقّق دور المستخدم عبر `supabase.rpc('has_role', { _user_id, _role: 'admin' })` ومثلها لـ owner؛ غير المخوّل يُعاد توجيهه إلى `/`.
  - قائمة طلبات `action_type = 'approve_prescription'` و `status = 'pending'` مع `useEffect` + `supabase.channel(...).on('postgres_changes', ...)` و teardown عبر `removeChannel` (اتباع cloud-realtime).
  - أزرار **Approve** / **Reject** تستدعي server functions حقيقية.
- `src/lib/pharmacist-approvals.functions.ts` — اثنان `createServerFn({ method: 'POST' })` مع `.middleware([requireSupabaseAuth])` و `.inputValidator(zod)`:
  - `approvePrescription({ approvalId, note? })`
  - `rejectPrescription({ approvalId, reason })`
  - كلاهما يتحقق داخل الـ handler من has_role(admin OR owner)، ثم UPDATE على `agent_approval_requests` (status, decided_by=context.userId, decided_at=now(), decision_note). تستخدم `context.supabase` (RLS-scoped) — لا حاجة لـ `supabaseAdmin`.
- يُسجَّل route الجديد تلقائياً عبر TanStack Router plugin (لا أعدّل `routeTree.gen.ts`).

---

### 3) DevOps DLQ Alerts — endpoint cron جديد

تم التحقق: `agent_events_dlq` يحتوي عمود `resolved_at` (NULL = نشط) و `failed_at`.

ملف جديد: `src/routes/api/public/hooks/dlq-alerts.ts`
- `createFileRoute("/api/public/hooks/dlq-alerts")` مع `server.handlers.POST`.
- يستدعي `verifyCronSecret(request)` من `@/lib/cron-auth.server` ويعيد `denied` إن وُجد (الالتزام بالنمط الصحيح: `if (denied) return denied`).
- `const { supabaseAdmin } = await import('@/integrations/supabase/client.server')` (dynamic import داخل الـ handler — ليس top-level).
- يقرأ عدد سجلات DLQ النشطة (`resolved_at IS NULL` آخر ساعة + المجموع غير المحلول).
- إذا تجاوز عتبة (افتراضياً 5 جديدة/ساعة)، يدرج صفّاً في `operations_alerts` (جدول موجود) ويُدرج `notifications` لجميع admin/owner — مع dedupe بسيط عبر `alert_dedupe` بمفتاح اليوم لتجنب spam.
- `GET` يعيد hint فقط، بدون كشف بيانات.
- يُرجع `{ ok, dlq_active, new_last_hour, alerted }` كـ `Response.json(...)`.

اختبار وحدة جديد: `src/__tests__/unit/dlq-alerts.test.ts` — يستدعي الـ handler مباشرة مع mock supabase ويتحقق من السلوك تحت/فوق العتبة.

تذكير cron: يمكن جدولته يدوياً عبر pg_cron لاحقاً (لن أعدّل cron من هنا — endpoint جاهز للنداء).

---

## ما لن أفعله (تفادي الأخطاء التي رفضناها سابقاً)

- لن أنشئ `_authenticated/pharmacist.tsx` layout (لا حاجة — صفحة واحدة).
- لن أستخدم `serverFn`/`server.handlers.POST` كاستيراد عاري، ولا `.validator` (سأستخدم `.inputValidator`)، ولا `json()`.
- لن أستورد `supabaseAdmin` على top-level في ملفات route.
- لن ألمس enum `app_role` ولن أخترع دور "pharmacist".
- لن أعدّل `index.tsx` الحالي ولا `__root.tsx` ولا `event-consumer.ts`.
- لن أضيف أعمدة إلى `agent_approval_requests` (الموجود كافٍ).

## Verification

- Tests: `bunx vitest run src/__tests__/unit/dlq-alerts.test.ts`
- Build: TanStack Router plugin يتولى regeneration للـ routeTree.
- يدوي: زيارة `/titans` و `/pharmacist-dashboard` بعد تسجيل دخول admin/owner.