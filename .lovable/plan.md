
# Plan — SuperBrainSovereign (تكييف واقعي)

استبدال الـ blueprint الوهمي بنواة قرارات حقيقية مربوطة بقاعدة البيانات والوحدات القائمة.

## 1. Migration — `ai_neural_synaptic_log`

```sql
CREATE TABLE public.ai_neural_synaptic_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_source text NOT NULL,
  target_destination text NOT NULL,
  decision_id text,
  is_safe boolean,
  district text,
  dispatched_tools text[] DEFAULT '{}',
  payload_transmitted jsonb NOT NULL,
  execution_time_ms numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_neural_synaptic_log TO authenticated;
GRANT ALL ON public.ai_neural_synaptic_log TO service_role;
ALTER TABLE public.ai_neural_synaptic_log ENABLE ROW LEVEL SECURITY;

-- المستخدم يقرأ سجله فقط؛ الإدمن يقرأ الكل
CREATE POLICY neural_log_self_read ON public.ai_neural_synaptic_log
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY neural_log_self_insert ON public.ai_neural_synaptic_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX ON public.ai_neural_synaptic_log (user_id, created_at DESC);
CREATE INDEX ON public.ai_neural_synaptic_log (district, created_at DESC);
```

## 2. Module scaffold `src/modules/ai-brain/`

- `services/SuperBrainSovereign.ts` — نواة نقية (لا imports للـ supabase). تصدير:
  - `type CognitiveTool`, `type BrainDecisionMatrix`.
  - `TOOL_REGISTRY`: قائمة **مختصرة** بالأدوات الفعلية المتوفرة في المشروع (drug-safety, pharmacy-nearby, prescription-review, maternal-campaign, geo-router, restock-alert…) — لا 800 وهمية.
  - `decide(input)` نقي (بدون I/O) يُرجع `BrainDecisionMatrix` بناءً على:
    - **Drug safety**: يستعلم عن تداخلات من `catalog_products` + قاعدة مبسّطة للحالات المزمنة (سكري/ضغط) — إذا وُجد تعارض → `isSafe=false` + `alternativeSuggested` من `search_medicines_public`.
    - **Geo routing**: يستدعي `pn_search_medicine_nearby(lat,lng,name)` لاختيار أقرب فرع + ETA تقديري.
    - **Maternal marketing**: إذا الكلمات المفتاحية (حليب/أطفال/بشرة) → يبني رسالة عربية موحّدة، لكن **لا يرسل** — يُرجع اقتراحاً فقط.
- `functions/brain.functions.ts` — `createServerFn` `executeNeuralInference` مع `requireSupabaseAuth`:
  1. يستدعي `SuperBrainSovereign.decide` مع حقن adapter يقرأ Supabase.
  2. يسجّل النتيجة في `ai_neural_synaptic_log` عبر `context.supabase`.
  3. يُرجع `BrainDecisionMatrix`.
- `domain/types.ts` — أنواع مشتركة.
- `index.ts` — re-exports نظيفة.

## 3. Tests
`src/__tests__/unit/ai-brain/decide.test.ts`:
- سلامة دوائية: مريض سكري + سؤال عن ديكلوفيناك → `isSafe=false`.
- توجيه: عدن → فرع عدن أولاً.
- تسويق أمومة: كلمة "حليب" → `marketingAction.isTriggered=true`.
- بدون أمومة → `marketingAction=null`.

## 4. غير مشمول (متعمّد)
- لا توليد لـ 800 أداة وهمية.
- لا واجهة admin (backend فقط).
- لا إرسال فعلي لحملات؛ فقط اقتراح.
- لا تعديل على `catalog_products` / `pn_*` — قراءة فقط.

## 5. بوابة القبول
1. `tsgo` نظيف.
2. `bun run build:dev` = 0.
3. `check-imports.ts` يمرّ (لا استيراد لـ `client.server` من ملف يصله client).
4. اختبارات الوحدة الأربع تنجح.
5. Migration مُطبّقة و RLS مفعّل و GRANTs موجودة.
