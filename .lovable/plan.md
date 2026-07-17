## Reality Check — قبل التنفيذ

المخطط الذي أرسلته (Phases 45.2 → 47) يعيد بناء 90% مما هو موجود فعلاً في المشروع، ويحتوي على أخطاء تقنية ستكسر الـ Build فوراً. لن أطبقه حرفياً. هذا موقف مطابق لما فعلته في Waves السابقة عند رفض `src/ai-brain/` و`ai_agents` المكررة.

### ما هو موجود فعلاً وسيتم إسقاطه من المخطط

| مقترح في المخطط | موجود فعلاً |
|---|---|
| `ai_events`, `ai_memory`, `ai_decisions`, `ai_agents`, `ai_audit_logs` | 5/5 موجودة بـ RLS |
| `ai_publish_event` RPC | موجود عبر `EventBus` (`src/ai/core/event-bus.ts`) — RPC مكرر يتجاوز الـ Bus |
| `ai_store_memory` / `ai_search_memory` | موجود بأفضل شكل: `MemoryManager` + `NeuralMemory` بـ pgvector |
| `BrainEngine`, `AgentRegistry`, `BaseAgent`, `BrainRouter`, `DecisionEngine` | موجودة كاملة في `src/ai/core/` و`src/ai/agents/` |
| `PharmacistAgent`, `PrescriptionAgent`, `CustomerAgent`, `InventoryAgent`, `CEOAgent`, `MarketingAgent`, `DoctorAgent`, `HospitalAgent`, `WhatsAppAgent`, `BrainAgent` | 13 وكيلاً مسجّلاً فعلاً في `src/ai/agents/register.ts` |
| `AICommandCenter` UI | 3 لوحات موجودة: `/admin-agent-universe`, `/admin-sun-core`, `/admin-sovereign` |
| `agent_approval_requests` + Decision Engine | شُحن الآن في Wave A |
| `doctor_profiles`, `hospital_profiles` | `hc_doctors` (45 عمود) و`hc_locations` أغنى بكثير |
| `ai_learning_feedback` | `ai_feedback` و`confidence_calibration_log` موجودان |
| `ai_workflows`, `ai_tasks` | تُغطى بـ `agent_events` + `agent_events_dlq` + جدولة `pg_cron` الموجودة |

### أخطاء تقنية في المخطط (لن تُنفَّذ كما هي)

1. **`export async function POST(request)`** — نمط Next.js/Remix؛ TanStack Start يستخدم `createFileRoute({ server: { handlers: { POST } } })`. الملفان `api.ai.brain.ts` و`api.whatsapp.webhook.ts` سيفشلان في الـ Build.
2. **`import {supabase} from "@/lib/supabase"`** — المسار غير موجود؛ الصحيح `@/integrations/supabase/client` (مُدار).
3. **RLS باستخدام `auth.jwt()->>'role' IN ('admin','owner')`** — يخالف قواعد المشروع الصريحة (تخزين الأدوار في جدول منفصل + `has_role()`). سيسمح لأي user_metadata مزوّر بالوصول. الأمن الحالي يستخدم `has_role()` بشكل صحيح.
4. **`ai_publish_event(...)` SECURITY DEFINER + بدون REVOKE من PUBLIC** — سيولّد تحذير Linter الذي نحاول إغلاقه في SEC-P1-003.
5. **الوكلاء الجدد كلها ترجع نصوصاً ثابتة (`return { success: true, message: "..." }`)** — لا قيمة إنتاجية، مجرد demoware.
6. **`api.whatsapp.webhook.ts` بدون تحقق توقيع Twilio/Meta** — بينما الموجود حالياً (`src/ai/integration/whatsapp/`) يتحقق من التوقيع.

---

## المقترح — نُطبّق فقط الفجوة الحقيقية

هدفك المُعلن في السطر الأخير: **"يكون آلياً بدون تدخل المبرمج كاختبار للأوركسترا"**. هذا هو الشيء الوحيد غير الموجود فعلاً. نبنيه فوق البنية القائمة.

### 1) Orchestrator Tick — دورة كاملة تلقائية

ملف جديد: `src/routes/api/public/ai/orchestrator-tick.ts`

- يُستدعى من `pg_cron` كل 5 دقائق
- يقرأ آخر الأحداث الحقيقية من الجداول القائمة:
  - `inv_stock_batches` → إن وُجد low-stock ⇒ ينشر `STOCK_LOW` على EventBus
  - `prescription_files` (uploaded آخر 5 دقائق) ⇒ ينشر `PRESCRIPTION_UPLOADED`
  - `orders` (created) ⇒ ينشر `ORDER_CREATED`
- كل حدث يذهب إلى `BrainEngine.execute()` الموجود → يستدعي الوكيل المناسب من الـ Registry الموجود
- كل قرار يُسجَّل في `ai_decisions` (موجود)
- أي إجراء تنفيذي عالي المخاطر يمر عبر `approval-gate.server.ts` الذي شُحن للتوّ (لن يُنفَّذ تلقائياً)
- تسجّل كل دورة في `agent_runs` (موجود)

### 2) AI Command Center — دمج بلا تكرار

ملف جديد: `src/routes/_authenticated/admin-ai-command.tsx`

- صفحة واحدة تجمع البيانات الحقيقية من الجداول الموجودة:
  - Brain Status: من `ai_world_health` + آخر تشغيل من `agent_runs`
  - Agents Grid: من `ai_agents` (12 صفاً موجودة) + آخر نشاط لكلٍّ منها
  - Event Stream: آخر 20 صفاً من `ai_events`
  - Decision Timeline: آخر 20 من `ai_decisions`
  - Predictions Panel: من `demand_forecasts` + `inv_expiry_alerts` (بيانات حقيقية)
  - Approvals Queue: يعيد استخدام مكوّن `ApprovalsPanel` من Wave A
- لا تكرار لأي جدول أو منطق. مجرد Read-through DTO عبر server function جديدة `getCommandCenterSnapshot`.

### 3) الجدولة

عبر `supabase--insert` (لا migration): تسجيل cron كل 5 دقائق يضرب `orchestrator-tick`.

### 4) ما لن يُنفَّذ من المخطط (مع السبب)

- ❌ `ai_workflows`, `ai_tasks`, `doctor_profiles`, `hospital_profiles`, `ai_learning_feedback` — مكرر.
- ❌ RPCs المكررة (`ai_publish_event`, `ai_store_memory`, `ai_search_memory`, `ai_create_decision`, `ai_get_agent`) — الطبقة الموجودة أنظف وأكثر أماناً.
- ❌ ملف `202607170008_ai_rls.sql` — يستخدم `auth.jwt()->>'role'` (خرق أمني).
- ❌ الوكلاء الجدد الفارغين (Pharmacy/Prescription/Customer/Inventory/CEO/Marketing/Doctor/Hospital) — النسخ الحقيقية موجودة تحت `src/ai/agents/`.
- ❌ `api.whatsapp.webhook.ts` جديد — الموجود مع توقيع Meta/Twilio يجب ألا يُستبدل بنسخة بلا توقيع.

### الملفات التي ستُلمَس فعلاً

| ملف | نوع |
|---|---|
| `src/routes/api/public/ai/orchestrator-tick.ts` | جديد |
| `src/lib/command-center.functions.ts` | جديد (server fn قراءة فقط) |
| `src/routes/_authenticated/admin-ai-command.tsx` | جديد |
| `supabase--insert` لجدولة cron | Data change |

بعد التطبيق سيكون لديك **أول Autonomous Loop حقيقي** يُشغّل الأوركسترا كل 5 دقائق على البيانات الفعلية، وصفحة قيادة واحدة توضح ماذا يحدث.

---

هل أُنفّذ هذا المقترح المُكيَّف، أم تريدني بدلاً منه أن أُنفّذ المخطط حرفياً كما أرسلته (مع علمك بأنه سيكسر الـ Build ويضاعف الجداول ويفتح ثغرة RLS)؟
