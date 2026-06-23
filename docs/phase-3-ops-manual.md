# Phase 3 — Human Ops Manual

## Daily routine (≤ 5 min)
1. Open **`/admin-agent-insights`**.
2. Look at the top row of **Confidence Calibration**:
   - `info` (green) → نظام صحي، لا تدخل.
   - `warning` (amber) → راقب الأداء غداً قبل أي قرار.
   - `critical` (red) → نفّذ خطوات "Critical alert" أدناه.
3. اقرأ آخر **Recommendations** (آخر 24 ساعة) وقرر إن كنت ستطبّقها يدوياً.

## Critical alert response (correlation < 0.3)
1. افتح `agent_decisions` لآخر 7 أيام (`/admin-social-posts` → Telemetry tab) وتحقق:
   - هل `fallback_used = true` في أغلب الصفوف؟ → عطّل الـ Feature Flag `agent.multi_variant.enabled` مؤقتاً عبر Settings.
   - هل أحد الـ variants يفوز دائماً مع تفاعل ضعيف؟ → راجع الـ prompts في كود `content.generator.server.ts`.
2. سجّل الحادثة في `executive_reports` مع السبب المتوقع.
3. أعد فحص المعايرة يدوياً بعد 24 ساعة.

## Manual weight tuning (only after ≥ 100 posts)
1. افتح **`/admin-agents`** → جدول `agent_weights`.
2. عدّل الـ `weight` لأي صف (يجب أن يكون مجموع كل الأوزان بين 0.5 و 2.0 — التطبيع تلقائي).
3. سجّل سبب التعديل في حقل `notes`.
4. الأثر يظهر فوراً في الـ Decision Engine عند التشغيل التالي للـ cron (8:00 صباحاً).

## Never do automatically (Guardrails)
- ✋ لا تُفعّل أي وضع "Auto-tune weights" — التعديل يدوي فقط.
- ✋ لا تُعدّل نصوص الـ prompt إلا عبر تحديث الكود ومراجعة.
- ✋ لا تُعيد التدريب التلقائي للنموذج قبل 3 أشهر من تشغيل حقيقي.

## Where data goes
| البيانات | المكان | مدة الاحتفاظ |
|---|---|---|
| Raw telemetry | `agent_decisions` | 90 يوم (تنظيف تلقائي) |
| Feedback events | `agent_feedback_events` | 90 يوم |
| Calibration log | `confidence_calibration_log` | دائم |
| Insights | `agent_performance_insights` | دائم |

## n8n: stats refresh feedback path
بعد ~24 ساعة من النشر، يجب أن يستدعي n8n:

```http
POST https://ympharma.lovable.app/api/internal/collect-feedback
Content-Type: application/json
x-internal-secret: <INTERNAL_API_SECRET>

{
  "post_id": "<uuid>",
  "platform": "facebook",
  "external_id": "<id from platform API — required for dedup>",
  "likes": 12, "comments": 3, "shares": 1, "views": 540
}
```

- يقبل دفعة (array) حتى 500 عنصر.
- يعيد `{ ok, accepted, duplicates, rejected, errors[] }` — تكرار نفس `external_id` خلال 48 ساعة = no-op (آمن لإعادة المحاولة).
- فشل هذه النقطة لا يوقف النشر (Non-blocking, P3-GATE-05).
