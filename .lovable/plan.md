# 📦 PHOENIX PHASE 6A — Inventory Intelligence Core

نبني على البنية الحقيقية الموجودة (`inv_stock_batches`, `inv_stock_movements`, `orders`, `ai_agents`, `agent_events`, ☀️ Sun Core) — بدون تكرار طبقات.

## المبدأ الحاكم
- **الوكيل موجود**: `ai_agents.code = 'inventory'` مُسجّل مسبقاً في Sun Core مع `capabilities=[demand_forecast,restock_alert,stale_detect]`. سنستخدمه بدل إنشاء وكيل جديد.
- **الأحداث موجودة**: `STOCK_RECEIVED / STOCK_MOVEMENT_CREATED / EXPIRY_ALERT_CREATED` مُشترَك بها الوكيل. Phase 6A تضيف حَسّاسات المخرجات فقط.
- **بيانات المبيعات**: نقرأ من `orders` + الحركات، بدون طبقة `sales` وهمية.

## المخرجات

### 1) Migration — 3 جداول (لا 4)
- `inventory_health_scores`: `product_id`, `score` (0-100), `status` (healthy/warning/critical/dead), `availability_pct`, `velocity_daily`, `expiry_risk`, `days_of_cover`, `recommendation`, `computed_at`. **UNIQUE(product_id)** — تحديث مكاني بدل تراكم.
- `demand_forecasts`: `product_id`, `horizon_days` (7/30), `expected_units`, `method` (moving_avg/weighted), `confidence`, `computed_at`. **UNIQUE(product_id, horizon_days)**.
- `purchase_recommendations`: `product_id`, `recommended_qty`, `reason`, `urgency` (low/med/high/critical), `preferred_supplier_id` (FK اختياري)، `expected_stockout_at`, `status` (open/approved/dismissed/ordered), `created_at`, `resolved_at`.

كل الجداول: GRANT للمدراء (SELECT) + service_role كامل + RLS + `has_role`.

### 2) Module `src/modules/inventory-intelligence/`
```
domain/
  stock-health.ts      → دوال حساب Score نقية (بدون I/O)
  demand-model.ts      → MovingAverage 7/30 يوم
  expiry-model.ts      → حساب مخاطر الانتهاء من دفعات inv_stock_batches
server/
  recompute.server.ts  → snapshot دورية لجميع المنتجات (batch)
  intelligence.functions.ts → sunListHealth, sunListRecommendations, recomputeNow (admin)
events/
  index.ts             → LOW_STOCK_PREDICTED / PURCHASE_RECOMMENDED / DEAD_STOCK_DETECTED
index.ts
```

### 3) SQL RPC واحد: `inv_intel_snapshot()`
دالة `SECURITY DEFINER` تحسب:
- Availability = min(1, current_qty / target_qty)
- Velocity = SUM(order_items في آخر 30 يوم) / 30
- DaysOfCover = current_qty / velocity
- ExpiryRisk = نسبة الكمية المنتهية خلال 90 يوم من `inv_stock_batches`
- Score مركّب موزون → status + recommendation
- UPSERT إلى `inventory_health_scores` + INSERT إلى `purchase_recommendations` عند `days_of_cover < 7`.

### 4) Cron كل 6 ساعات
`pg_cron` يستدعي `select public.inv_intel_snapshot();` مباشرة (SQL-only، لا حاجة لـ endpoint). ينشر `PURCHASE_RECOMMENDED` في `agent_events` → يمرّ عبر Sun Engine → يُرسَل للوكيل `inventory`.

### 5) لوحة `/admin-inventory-intel` تحت `_authenticated`
- كروت: صحة عامة، منتجات حرجة، توصيات مفتوحة، مخزون راكد.
- جدول Top-20 حسب Score (تصاعدي) مع action "توصية شراء".
- زر "احسب الآن" (admin) → server fn ينادي `recomputeNow`.

### 6) اختبارات
`src/__tests__/unit/inventory-intelligence/` — 4 اختبارات: moving-avg، expiry-risk، composite-score، recommendation-threshold.

## خارج نطاق 6A (يأتي في 6B / 7)
- Autonomous PO creation، اختيار مورد ذكي، Phase 7 Pharmacist Brain.
- Seasonality models — نبدأ بـ Moving Average فقط.

## Technical Details

**Composite Score (weighted):**
```
score = 0.35*availability + 0.25*(1 - expiry_risk)
      + 0.25*velocity_signal + 0.15*margin_signal
```
حيث `velocity_signal = clamp(days_of_cover/14, 0, 1)` و `margin_signal` من `products.price - products.cost` (إن وُجد، وإلا 0.5 محايد).

**Recommendation urgency:**
- `days_of_cover < 3` → critical
- `< 7` → high
- `< 14` → medium
- expiry_risk > 0.3 & velocity < 1/day → dead_stock (dismiss buy, mark clearance)

**Events emitted:** بواسطة trigger على `purchase_recommendations` عند INSERT: يُدرج صفّاً في `agent_events` باسم `PURCHASE_RECOMMENDED` + `entity_id=recommendation.id`. Sun Engine يوجّه للوكيل `inventory` (سيحتاج إضافة الحدث لـ `event_subscriptions` وللـ `event-router`).

**Verification:**
- Migration + linter نظيف.
- `bunx vitest run inventory-intelligence` أخضر.
- `select public.inv_intel_snapshot();` يعبّئ الجداول.
- `/admin-inventory-intel` يعرض بيانات حقيقية.

هل أنفّذ؟
