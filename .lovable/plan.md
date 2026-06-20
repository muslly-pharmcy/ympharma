المراحل المتبقية ضخمة (3 إلى 10). لتجنّب تغييرات سطحية أو كسر النظام، سأنفّذها كـ **6 دفعات متتالية**، كل دفعة قابلة للمراجعة والتراجع. الواتساب سيبقى كما هو يعمل (بدون تطوير) كما طلبت.

## الوضع الحالي (مفحوص)

موجود فعلياً في قاعدة البيانات والكود:
- `agent_runs` + `agent_actions` (جدولا الرصد المركزي) ✓
- Triggers: `intercept_new_prescription`, `intercept_new_order` تكتب في `agent_actions` تلقائياً ✓
- `enqueue_chronic_refill_action()` RPC للاحتفاظ بالمرضى ✓
- `marketing_queue`, `staff_alerts`, `operations_alerts`, `email_send_log`, `error_logs`, `system_incidents` ✓
- 9 وكلاء AI (مسارات `/api/public/hooks/agents/*`) ✓
- Cron hooks: `chronic-refills`, `nightly-intel`, `alerts-worker`, `weekly-*`, `rx-mirror` (جديد) ✓
- `admin-ai-orchestrator.tsx` لوحة عرض ✓

ناقص أو غير مفعّل:
- لا يوجد جدول `agent_events` (event bus قابل لإعادة التشغيل)
- `agent_actions` يُكتب فيه من 2 trigger فقط — باقي الوكلاء لا يسجلون
- لا توجد لوحة موحّدة لـ `agent_actions` (التنفيذ/الموافقة/إعادة المحاولة)
- لا توجد حلقة `reserve_stock` فعلية على `orders` (الـ trigger يكتب action فقط، لا ينقص المخزون)
- لا قياسات أداء (slow queries، latency)
- لا تقرير production-readiness نهائي

## الدفعات

### الدفعة 1 — Phase 3 إكمال: Observability Wrapper موحّد
- إضافة helper `logAgentAction()` في `src/lib/agent-actions.ts` يكتب كل دخول/خروج/خطأ.
- تغليف الـ 9 endpoints في `api/public/hooks/agents/*` به (تعديل ميكانيكي، لا منطق جديد).
- نتيجة: كل تشغيل وكيل يخلق صف في `agent_actions` تلقائياً.

### الدفعة 2 — Phase 4 إكمال: لوحة Automation Hub التشغيلية
- صفحة `/admin-automation-hub` تعرض `agent_actions` مع فلاتر (الحالة/الأولوية/الوكيل/الـ pipeline).
- أزرار: موافقة (Execute) / تخطي (Skip) / إعادة محاولة.
- اعتماد على RLS موجود + role check.

### الدفعة 3 — Phase 5: Event Bus
- migration: جدول `agent_events` (event_name, entity_type, entity_id, payload, occurred_at, processed_at, retry_count).
- دوال DB لإصدار حدث `emit_event()` + view `unprocessed_events`.
- ربط 3 أحداث أساسية: `PrescriptionUploaded`, `OrderCreated`, `RefillDue` عبر triggers موجودة.
- لا processor خلفي في هذه الدفعة (للحفاظ على البساطة) — العرض فقط.

### الدفعة 4 — Phase 6: حلقة Inventory الفعلية
- RPC `reserve_order_stock(order_id)` ينقص `products.stock` ذرّياً مع تسجيل في `agent_actions` (action_type=`RESERVE_STOCK`).
- تحديث trigger `intercept_new_order` ليستدعي RPC ويضع الحالة `EXECUTED` أو `FAILED`.
- تنبيه `staff_alerts` عند `stock < min_stock`.

### الدفعة 5 — Phase 7+8: Retention + Notifications Foundation
- تفعيل cron `chronic-refills` (موجود لكن نتأكد من جدولته).
- إضافة جدول `internal_notifications` + helper `notify_admins(title, body, severity)`.
- ربط فشل `agent_actions` و`uptime_incidents` به (بديل WhatsApp).

### الدفعة 6 — Phase 9+10: Performance Audit + Production Report
- فحص slow queries عبر `pg_stat_statements`، إضافة indexes ناقصة.
- توليد `docs/production-readiness-final-2026-06.md` يحوي: حالة كل معيار، الأدلة، المخاطر المتبقية، Mermaid diagrams (architecture/DB/agents/event flow).
- لا تغييرات كود في هذه الدفعة، توثيق فقط.

## التفاصيل التقنية

- كل migration تحترم قاعدة GRANT + RLS + service_role.
- لا تعديل على ملفات `whatsapp.*` أو القنوات الخارجية.
- كل دفعة تنتهي بتشغيل اختبار يدوي مختصر (psql counts، استدعاء endpoint).
- زمن متوقع لكل دفعة: 1-3 ملفات + migration واحد كحد أقصى.

## ما أحتاجه منك

- موافقة على هذه البنية، **والبدء بالدفعة 1**.
- إذا كنت تريد تخطي/دمج/تأجيل دفعة معينة، أخبرني الآن.
- بعد كل دفعة، أتوقف للمراجعة قبل الانتقال للتالية (لا أُنفّذ الست دفعات دفعة واحدة).
