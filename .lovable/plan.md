# إعادة هيكلة Phase A+B إلى src/core/ (Enterprise OOP)

## الهدف
استبدال الملفات المسطّحة الحالية (`src/lib/idempotency.server.ts`, `src/lib/ai-safety.ts`, `src/lib/backup-verification.functions.ts`, منطق DLQ داخل `event-bus.functions.ts`, منطق Retention في hook منفرد) بطبقات Service/Decorator/Engine منظّمة تحت `src/core/` كما في الـ blueprint — **دون كسر أي مستهلك حالي**.

## مبدأ عدم الكسر
الملفات القديمة تبقى كـ **shim re-exports** تستدعي الطبقة الجديدة. أي hook أو route يستورد `checkIdempotency` / `storeIdempotency` / `runAiSafety` / `verifyLatestBackup` / `listDlqEvents` يظل يعمل بلا تغيير.

## الهيكل النهائي

```text
src/
├── core/
│   ├── idempotency/
│   │   ├── IdempotencyService.ts       (SHA-256 عبر Web Crypto، TTL، hash check)
│   │   └── withIdempotency.ts          (decorator يلفّ server fn)
│   ├── dlq/
│   │   ├── DLQService.ts               (list/get/resolve)
│   │   └── DLQReplayEngine.ts          (single + bulk replay + backoff)
│   ├── retention/
│   │   ├── RetentionPolicyEngine.ts    (يستدعي apply_retention_policies RPC)
│   │   └── RetentionScheduler.ts       (واجهة للـ hook)
│   ├── ai-safety/
│   │   ├── PIIRedactor.ts              (هواتف/إيميل/IBAN/رقم وطني)
│   │   ├── InjectionDetector.ts        (أنماط prompt injection محدّدة)
│   │   └── AISafetyGuard.ts            (facade يجمع الاثنين)
│   └── backup/
│       ├── BackupVerificationService.ts (بنية + تطابق عدّاد + حداثة)
│       └── BackupRestoreTest.ts        (dry-run integrity فقط — لا restore فعلي على Cloud)
├── hooks/
│   └── useMotionAnimation.ts           (variants framer-motion قياسية)
└── components/admin/
    └── DLQPanel.tsx                    (يُستبدل محتوى الـ panel الحالي بحركة framer-motion)
```

## ملفات Shim (تبقى لتجنّب الكسر)
- `src/lib/idempotency.server.ts` → `export { checkIdempotency, storeIdempotency } from "@/core/idempotency/IdempotencyService"`
- `src/lib/ai-safety.ts` → `export * from "@/core/ai-safety/AISafetyGuard"`
- `src/lib/backup-verification.functions.ts` → يبقى كـ `createServerFn` يستدعي `BackupVerificationService`
- `src/lib/event-bus.functions.ts` → دوال DLQ تصبح أغلفة رقيقة فوق `DLQService` / `DLQReplayEngine`

## التبعيات
- `framer-motion` (للـ DLQPanel + useMotionAnimation) — أتحقّق إن كانت مثبّتة؛ إن لا، `bun add framer-motion`.
- لا حاجة لأي package إضافي. كل التشفير عبر `globalThis.crypto.subtle` (متوافق Cloudflare Workers).

## ما لن أنفّذه من الـ blueprint
- **Circuit Breaker** بحالة in-memory — عديم الفائدة على workers stateless (كل request يبدأ من صفر). سيُسجَّل كـ ADR.
- **BackupRestoreTest فعلي** يستعيد نسخة كاملة — يتطلّب صلاحيات وموارد ليست متاحة على Lovable Cloud. أكتفي بفحص integrity البنيوي.
- **Rate Limiting داخل IdempotencyService** — موجود فعلياً عبر `rate_limit_buckets` و middleware منفصل.

## خطوات التنفيذ (ترتيب)
1. التحقّق من `framer-motion` وتثبيته عند اللزوم.
2. كتابة 10 ملفات `src/core/**` الجديدة (طبقات نظيفة، JSDoc عربي، TS صارم).
3. كتابة `src/hooks/useMotionAnimation.ts`.
4. تحويل `src/lib/{idempotency.server,ai-safety,backup-verification.functions}.ts` إلى shims.
5. تحديث دوال DLQ في `src/lib/event-bus.functions.ts` لاستخدام `DLQService` + `DLQReplayEngine` (نفس التواقيع المُصدَّرة).
6. تحديث `src/components/admin/DlqPanel` (أو ما يعادله داخل `/admin-event-bus`) لاستخدام framer-motion عبر `useMotionAnimation`.
7. تشغيل typecheck والتأكّد من خلوّه من الأخطاء.

## معايير القبول
- لا أخطاء `tsgo` ولا أخطاء build.
- كل الـ hooks الأربعة (`hourly-*`) و route `/admin-event-bus` و `/admin-backup-verify` تعمل بلا تغيير سلوكي.
- DLQPanel يعرض حركة دخول/خروج للصفوف عند replay/resolve.
