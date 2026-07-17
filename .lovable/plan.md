# ☀️ AI SUN CORE — Phase 1 Plan

النواة الشمسية للمنظومة. نبني على ما هو **موجود فعلاً** (`agent_events` + `EventDispatcher` + `SuperBrainSovereign` + `event-consumer`) بدلاً من إعادة اختراع طبقة موازية.

## المبدأ الحاكم
- **لا نُنشئ جدول `ai_core_events` جديد** — عندنا `agent_events` يعمل مع DLQ و FIFO drain. تكرارُه يُنشئ ازدواجاً في مصدر الحقيقة.
- **AI SUN CORE = طبقة تنسيق (Orchestrator)** فوق: Event Bus + SuperBrainSovereign + Agent Registry، وليست بديلاً لها.
- كل قرار يُسجَّل في **ذاكرة عصبية** قابلة للاستعلام ليتعلّم النظام.

## المخرجات (Phase 1 فقط)

### 1) Sun Engine — طبقة تنسيق مركزية
`src/ai/sun-core/`
```
sun-engine.ts         → ingest(event) → classify → route → record
event-router.ts       → يربط event_name بـ agent(s) عبر AgentRegistry
decision-engine.ts    → يستدعي SuperBrainSovereign.decide() ويُطبّق guardrails
memory-manager.ts     → يكتب/يقرأ neural_memory
agent-registry.ts     → تسجيل الوكلاء (Pharmacist/Inventory/Revenue/Customer/Security) + capabilities
index.ts
```
- **لا يستبدل** `event-consumer.ts` — بل يُستدعى منه كـ `handler` لأحداث مصنّفة `SUN_*` أو أحداث يقرر الـ router أنها تحتاج تحليلاً مركزياً.

### 2) Neural Memory — ذاكرة القرارات
جدولان جديدان (مع GRANTs + RLS):
- `sun_decisions`: `event_id`, `event_name`, `agent_dispatched`, `decision`, `confidence`, `reasoning`, `outcome`, `latency_ms`, `created_at`
- `sun_memory`: `scope` (customer/product/market/agent), `subject_id`, `key`, `value jsonb`, `weight`, `last_seen_at` — نموذج key-value مرن للتعلّم التراكمي.

استعلامات: `recall(scope, subject_id)`، `remember(scope, subject_id, key, value)`.

### 3) Agent Registry (جدول واحد)
`ai_agents`: `code` (pharmacist/inventory/revenue/customer_galaxy/security_guardian), `capabilities jsonb`, `event_subscriptions text[]`, `enabled`, `health`. يُبذَر بالخمسة وكلاء المذكورين.

### 4) ربط بالبنية الحالية
- `event-consumer.ts`: عند حدث غير معروف أو حدث مُعلَّم `sun:*` → ينادي `SunEngine.ingest(ev)` بدلاً من DLQ فوري.
- `SuperBrainSovereign.decide()` يبقى قلب التفكير — Sun Engine يزوّده بـ `memory context` من `sun_memory` ويسجّل النتيجة في `sun_decisions`.

### 5) لوحة رصد (Read-only)
مسار `/admin-sun-core` تحت `_authenticated`:
- عدّاد أحداث/دقيقة، متوسط زمن القرار، آخر 50 قراراً، توزيع الوكلاء المُستدعَين، صحة كل وكيل.

## ما هو خارج نطاق Phase 1 (يأتي لاحقاً)
- 100/800 وكيل — نبدأ بـ 5 فقط.
- Evolution Engine (تطوير ذاتي).
- Market/Knowledge Planets.
- n8n / WhatsApp / ERP orchestration أعمق (موجود بالفعل جزئياً).

## Technical Details

**Migration واحدة** تُنشئ:
```sql
CREATE TABLE public.ai_agents (...);       -- + GRANT + RLS
CREATE TABLE public.sun_decisions (...);   -- + GRANT + RLS (admin/service read)
CREATE TABLE public.sun_memory (...);      -- + GRANT + RLS
-- Seed 5 agents
```

**Server functions** (`src/ai/sun-core/*.functions.ts`):
- `sunIngest({ eventId })` — يُستدعى من consumer، محمي بـ service_role internally.
- `sunListDecisions({ limit })` — `requireSupabaseAuth` + admin check للوحة.

**تعديل واحد** على `src/routes/api/public/hooks/event-consumer.ts`:
- في الـ `default` case: بدل رمي DLQ فوراً، جرّب `SunEngine.ingest(ev)` أولاً، وإن رجع `unhandled` → DLQ.

**اختبارات**:
- `src/__tests__/unit/ai-sun-core/sun-engine.test.ts` — ingest + routing + memory recall.

## Verification
- Migration تمرّ + linter نظيف.
- `bunx vitest run` يمرّ.
- `/admin-sun-core` يعرض قراراً واحداً على الأقل بعد dispatch حدث `TestEvent`.

هل أنفّذ هذه الخطة؟
