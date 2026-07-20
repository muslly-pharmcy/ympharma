Chief — أوصي بتقسيم هذا الطلب الكبير إلى Shipment واحد قابل للشحن الآن (E1) بدلًا من ضخّ كل شيء دفعة واحدة. هذا يحافظ على الجودة ويوفّر نقطة تحقق حقيقية قبل التوسع.

## نطاق Shipment E1 — Analytics Foundation + Mobile Baseline

### 1) Analytics Foundation (لبّ Phase 7)
- **Migration**: Materialized Views للتقارير الثقيلة:
  - `mv_sales_daily` (يوم × org × branch: إيراد، عدد طلبات، متوسط سلة)
  - `mv_dispenses_daily` (صرف يومي، عدد وصفات)
  - `mv_customers_growth` (عملاء جدد/نشطون شهريًا)
  - `mv_loyalty_activity` (نقاط مكتسبة/مستبدلة)
  - `mv_campaigns_perf` (إرسال، تسليم، فشل، تحويل)
  - `mv_inventory_health` (منخفض/راكد/قريب انتهاء)
- دالة `refresh_analytics_mvs()` + `pg_cron` كل 15 دقيقة.
- RLS-safe views مقروءة عبر `has_role`.

### 2) Server Layer
- `src/lib/analytics.functions.ts`: 
  - `getExecutiveKpis()` — KPIs اليوم/الأسبوع/الشهر.
  - `getSalesSeries({ range })` — سلاسل زمنية.
  - `getInventoryHealth()`, `getCrmSummary()`, `getCampaignsSummary()`, `getAiUsageSummary()`.
- كلها `requireSupabaseAuth` + `requirePermission('analytics.read')`.
- إضافة `analytics.read` / `analytics.export` إلى RBAC.

### 3) Executive Dashboard UI
- `/analytics` (executive): بطاقات KPI + مخطط إيرادات + Top products + تنبيهات مخزون + أداء الحملات + استخدام AI.
- `/analytics/sales`, `/analytics/inventory`, `/analytics/crm` (لوحات متخصصة).
- تصدير CSV (client-side) — PDF/Excel مؤجل لـ E2.
- استخدام `recharts` (خفيف، متوافق SSR).

### 4) Mobile Baseline (Responsive)
- مراجعة الصفحات المحمية لضبط breakpoints (390/412/768/1024).
- استبدال الجداول الرئيسية بـ Card layout على `<md`:
  - `/customers`, `/prescriptions`, `/dispenses`, `/promotions`, `/campaigns`, `/analytics`.
- إضافة `<BottomNav>` للأجهزة `<md` مع الاختصارات الحرجة (Home / Rx / Dispenses / Analytics / Me).
- Safe Area (iOS notch) عبر `env(safe-area-inset-*)` في `src/index.css`.

### 5) PWA (Manifest-only في E1)
- `public/manifest.webmanifest` + أيقونات + `theme-color` + `apple-touch-icon`.
- **بدون** service worker في E1 (يتبع دستور Lovable PWA — نُفعّل offline في E2 فقط عند الطلب صراحةً).
- اختبار Add-to-Home-Screen على Android/iOS.

### 6) Tests
- `tests/analytics-kpis.test.ts` — استعلامات KPI + الصلاحيات.
- `tests/mobile-responsive.test.ts` (Playwright smoke على 390×844 و 412×915 و 768×1024).

## ما هو مؤجَّل صراحةً (لا يشمله E1)
- **Integration Constitution الكامل** (Adapter/Outbox/Circuit Breaker/Distributed Tracing) — يستحق Shipment مستقل E2 بعد Phase 8.
- **Capacitor / Native wrapping** — بعد ثبات PWA.
- **PDF/Excel export** — مكتبات ثقيلة، تُضاف بعد قياس الاستخدام.
- **Offline mode + Service Worker** — يتطلب سياسات cache دقيقة، Shipment مستقل.
- Phase 8 (Finance) و Phase 9 (Hardening) و Phase 10 (External Integrations) — Shipments لاحقة.

## تفاصيل تقنية (للمراجعة الهندسية)
- MVs مع `CREATE UNIQUE INDEX` لدعم `REFRESH CONCURRENTLY`.
- كل view يحمل `organization_id` للسماح بـ RLS عبر view-based policies أو استعلامات مصفّاة في server functions.
- `analytics.functions.ts` يُرجع DTOs مُبسّطة (أرقام + strings) — لا كائنات معقدة.
- Recharts داخل `<ClientOnly>` لتجنّب مشاكل SSR في TanStack Start.
- Bottom nav مخفي على `md:hidden`، ولا يُعرَض في صفحات auth.

## معايير القبول
- Typecheck + lint نظيفَان.
- كل الاختبارات خضراء (وحدة + Playwright mobile).
- Lighthouse Mobile ≥ 85 (Performance) على `/analytics` و `/customers`.
- LCP < 2.5s على شبكة 3G محاكاة.

هل توافق على E1 بهذا الشكل، أم تريد إضافة/حذف عناصر قبل البدء؟