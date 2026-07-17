## هدف التدقيق

تنفيذ بروتوكول التحقّق (Enterprise Verification) على المستودع الحالي كما هو، بدون كتابة أي إصلاح كود. كل نتيجة مربوطة بملف + رقم سطر أو بصف SQL من قاعدة البيانات الحيّة. أي معيار لا يوجد له دليل → يُكتب `NOT VERIFIED` (بدل التخمين).

بسبب حجم المستودع (156 دالة SECURITY DEFINER، ~160 جدول، عشرات المسارات، ~50 وحدة)، تنفيذ المراحل الثماني كاملة في جولة واحدة يستهلك رصيداً غير مبرر ويكرر جزئياً تقارير `docs/engineering/reports/PHOENIX-*` و`TITANUS-*` الموجودة. لذلك الخطة تبدأ بالمراحل ذات الأثر الأعلى، مع أبواب لتوسيع النطاق بأمر لاحق.

## نطاق الجولة الحالية (Waves)

Wave A — المراحل الحرجة (تُنفَّذ الآن بعد الموافقة):
- Phase 0: Inventory
- Phase 2: Database Verification
- Phase 3: Security (OWASP + RLS + Definer + Isolation)
- Phase 5: Healthcare Domain (Doctors/Pharmacies/Prescriptions/Invoices/Inventory)

Wave B — يُطلق بأمر منفصل بعد مراجعة Wave A:
- Phase 1: Architecture
- Phase 4: Performance
- Phase 6: AI safety
- Phase 7: Frontend/RTL/SEO
- Phase 8: DX (lint/typecheck/tests)

## المخرج

ملف واحد: `docs/engineering/reports/AUDIT-2026-07-17.md`
بنية كل نتيجة (حرفياً كما في التوجيه):

```text
ID: AUDIT-<PHASE>-<NNN>
Severity: P0 | P1 | P2 | P3
Confidence: %
Evidence: <SQL row | file:line | grep hit>
Files: <path>
Exact Lines: <a-b>
Root Cause:
Business Impact:
Technical Impact:
Security Impact:
Suggested Fix: <نصي فقط — لن يُطبَّق>
Estimated Complexity: S | M | L
Regression Risk: Low | Med | High
Dependencies: <IDs>
```

بعد قائمة النتائج، يُضاف قسم:
Critical Path • Quick Wins • High ROI • Long-Term Refactor • Technical Debt • Scalability Roadmap • Production Readiness.

## قواعد التحقّق (Evidence-Only)

- كل ادّعاء SQL يُثبَت عبر `supabase--read_query` أو `supabase--linter`، مع نسخ صف الدليل حرفياً.
- كل ادّعاء كود يُثبَت بمسار وأرقام أسطر مقروءة عبر `code--view` أو `rg -n`.
- ادّعاءات الأمان تُقارن أيضاً مع `security--get_scan_results` قبل تصنيفها.
- إذا فشل الدليل: تُكتب `NOT VERIFIED` بدل الاستنتاج.
- لا يُشغَّل أي `supabase--migration` ولا أي تعديل ملفات في هذه الجولة.

## أدوات لكل مرحلة

- Phase 0 Inventory: `rg --files src`, `ls supabase/migrations`, `psql \dt public.*`, `psql \df public.*`, قراءة `src/routeTree.gen.ts` لعدّ المسارات.
- Phase 2 Database:
  - `supabase--linter`
  - `select ... from pg_policies` (كل السياسات بصياغتها)
  - `pg_proc` للتحقّق من `search_path` و`security_definer`
  - `information_schema.role_table_grants` للتحقّق من GRANT/REVOKE
  - `pg_constraint` (FK/CHECK)، `pg_indexes`
  - `cron.job` (الجداول المجدولة)
- Phase 3 Security:
  - قراءة كل `src/routes/api/public/**` — التحقّق من توقيع كل webhook + rate limit + input validation.
  - قراءة كل `*.functions.ts` — التحقّق من `.middleware([requireSupabaseAuth])` وفحص الصلاحيات قبل استخدام `supabaseAdmin`.
  - فحص `has_role` / RBAC (منع الاعتماد على `profiles.role` أو `localStorage`).
  - فحص عزل `organization_id` / `branch_id` في السياسات.
  - CSP/CORS من `src/routes/__root.tsx` + هيدرز التطبيق.
  - `security--get_scan_results` للمقارنة مع ما تم تجاهله سابقاً.
- Phase 5 Healthcare:
  - جداول `hc_*`, `pn_*`, `prescription_*`, `invoice_*`, `inv_*`, `catalog_*` — للتحقق من RLS لكل جمهور (owner / patient / pharmacist / public).
  - مسارات `/pharmacies`, `/doctor/*`, `/pharmacist/*`, `/prescription*` — التحقّق من قناة القراءة (`requireSupabaseAuth` مقابل publishable client).
  - وحدات `src/modules/product-intelligence/`, `invoice-intake/`, `prescription-*` — تتبع OCR → تخزين → عرض.

## غير مشمول (سيُكتب `NOT VERIFIED` أو يُؤجَّل)

- قياسات Lighthouse/LCP/CLS/INP (بحاجة تشغيل متصفح — تُنفَّذ فقط لو طلبت Wave B).
- تدقيق كل واحدة من الـ 156 دالة SECURITY DEFINER — سيُغطَّى بجدول واحد مبني من `pg_proc` مع تمييز أي دالة `search_path IS NULL` أو `EXECUTE TO PUBLIC` كنتيجة، بدون فتح جسم كل دالة (إلا P0).
- أي ادّعاء أداء بلا قياس رقمي.

## التقدير

- استعلامات القراءة: ~30 استعلام SQL.
- قراءات الملفات: ~60-90 ملف (routes + functions + middleware + core).
- الحجم المتوقع للتقرير: 40-80 نتيجة موثّقة، ~2000-4000 سطر Markdown.

## بعد الجولة

سأقدّم في نهاية Wave A:
1. قائمة P0 (إن وُجدت) مرتّبة حسب الأثر.
2. اقتراح Wave B مع نطاقها المحدد.
3. أنتظر أمر GO منفصل قبل أي إصلاح كود (وفق نص التوجيه: "Never generate fixes before proving the problem exists" — الإصلاح يبقى نصياً في `Suggested Fix`).
