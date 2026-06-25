# خطة تنفيذ v14.0 حرفياً

اخترت "تنفيذ v14 حرفياً". سأكتب الملفات الستة كما وردت بالضبط، لكن يجب أن تعرف مسبقاً **ما الذي سيكسر** لأن v14 تتعارض مع البناء الفعلي وقاعدة البيانات. لن أصلحها ذاتياً — هذا قرارك.

## الملفات التي ستُكتب/تُستبدل

1. `src/routes/api/public/hooks/dlq-alerts.ts` — استبدال كامل
2. `src/lib/pharmacist-approvals.functions.ts` — استبدال كامل
3. `src/routes/_authenticated/pharmacist/dashboard.tsx` — جديد (المسار الحالي `pharmacist-dashboard.tsx` سيُحذف لتفادي ازدواج)
4. `src/routes/titans.tsx` — استبدال (يستورد من `@/components/sections/*` بدلاً من `@/components/titans/*` الحالي)
5. `supabase/migrations/<ts>_operations_alerts.sql` — migration
6. `src/__tests__/unit/dlq-alerts.test.ts` — استبدال

## كسور مؤكدة (Build / Runtime)

| # | الكسر | السبب |
|---|---|---|
| B1 | **Build fail** في الاختبار | v14 يكتب `import { POST } from "@/routes/api/public/hooks/dlq-alerts"` — لكن TanStack لا يُصدّر `POST`، بل `Route` فقط. لن يُصرَّف. |
| B2 | **Typecheck fail** في server fns | v14 يستخدم `({ context, input })` — التوقيع الصحيح هو `({ data, context })`. كل استدعاءات `approvePrescription({ approvalId })` ستفشل (يجب `{ data: { approvalId } }`). |
| B3 | **Runtime DB error** في dlq-alerts | الجدول `agent_events_dlq` لا يملك أعمدة `resolved` و `event_name` و `error`. الأعمدة الفعلية: `resolved_at`, `failed_at`, وحقول event مختلفة. الاستعلام سيرجع خطأ. |
| B4 | **Runtime DB error** في approvals | `agent_approval_requests` لا يملك `approved_by/approved_at/rejected_by/rejected_at/rejection_reason`. الأعمدة الموجودة: `decided_by`, `decided_at`, `decision_note`. UPDATE سيفشل. |
| B5 | **Migration fail** | `operations_alerts` موجود مسبقاً بـ `UNIQUE(dedupe_key)` و schema مختلف (kind, severity, status, summary, ref_id). `CREATE TABLE` بدون `IF NOT EXISTS` على الأعمدة + `CREATE UNIQUE INDEX` بدون `IF NOT EXISTS` سيفشل أو يتعارض. |
| B6 | **Build/route conflict** | إنشاء `_authenticated/pharmacist/dashboard.tsx` يتطلب إما حذف الملف الحالي `_authenticated/pharmacist-dashboard.tsx` أو سيبقى مساران. |
| B7 | **Missing components** | v14 يستورد `@/components/ui/Button` (B كبيرة), `@/components/ui/GlassCard`, `@/components/ui/GradientText`, `@/components/motion/Reveal`, `@/components/sections/*` — كلها غير موجودة (الموجود `@/components/titans/...` و `@/components/ui/button`). build سيفشل. |
| B8 | JSX المُلصق في الـ dashboard تالف | يحتوي `useState>` (فاقد generic)، وعناصر JSX فارغة `<div className="...">` بلا أوسمة إغلاق/محتوى متماسك. لن يُصرَّف. |

## ما سأفعله بالضبط

- أكتب الملفات الستة **كما هي في v14** (نسخ حرفي).
- أحذف `src/routes/_authenticated/pharmacist-dashboard.tsx` القديم.
- لا ألمس أي ملف آخر، لا أُصلح الكسور المذكورة أعلاه.
- بعد الكتابة، أُشغّل typecheck/tests وأُبلغك بالنتائج الفعلية.

## ما لن أفعله

- لن أُكيّف الأعمدة، ولن أُغيّر `input→data`، ولن أُنشئ المكونات الناقصة، ولن أُحوّل `POST` import. هذه كلها كانت في الخيار الثاني الذي رفضته.

## توقع النتيجة

Build سيفشل في عدة أماكن (B1, B2, B7, B8). إن أردت المتابعة رغم ذلك، أكّد. إن غيّرت رأيك واخترت "تكييف v14 على schema الحقيقي" قل ذلك وسأعيد الخطة.