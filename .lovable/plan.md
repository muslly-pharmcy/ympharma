# خارطة طريق CTO — صيدلية المصلي

تقسيم تنفيذي للمراحل من **6C** حتى **14** مع الحالة الحالية، الأولوية، والمكوّنات.

## الحالة الحالية (تم إنجازه فعلياً)
- ✅ **Phase 6A/6B**: إدارة المخزون، الموردين، التكرارات، Audit Log، Trigger Monitoring، Bulk Operations مع CSV + Preview/Rollback.
- ✅ **WhatsApp Cloud + Twilio**: قنوات الإرسال موجودة (`whatsapp-cloud.functions.ts`, `whatsapp.ts`).
- ✅ **Customer Notification Preferences**: Opt-out token-based جاهز.
- ✅ **Agent Hubs**: `agent_runs`, `agent_actions`, `marketing_queue`, `staff_alerts`.
- ✅ رفع صور الروشتات/التأمين بصيغ موسّعة.

---

## ترتيب التنفيذ المقترح (4 موجات)

### الموجة 1 — إغلاق دورة العميل (أسبوع 1-2)
**Phase 6C — WhatsApp Customer Notifications** (نصفه جاهز)
- ربط 8 أحداث (`PRESCRIPTION_*`, `ORDER_*`) بـ `whatsapp_notification_dispatch`.
- جدول `whatsapp_delivery_logs` موجود → نضيف `correlation_id` + `attempts` + idempotency key.
- `sendWhatsAppTemplate()` + `retryFailedMessages()` cron كل 5 دقائق.
- `trackDeliveryStatus()` webhook من Twilio/Meta لتحديث `delivered/read/failed`.
- KPI: Delivery Rate ≥95%, لا تكرار.

**Phase 6D — WhatsApp AI Assistant** (الأساس موجود)
- توسيع `whatsapp-ai-agent.server.ts` بأدوات AI SDK:
  - `searchProducts`, `getOrderStatus`, `getPrescriptionStatus`, `getBranchAvailability`.
- حواجز صارمة: ممنوع إنشاء طلب/الموافقة على روشتة/تعديل مخزون (`needsApproval`).
- `stepCountIs(50)` + structured output.
- KPI: 70% من الأسئلة بدون تدخل بشري.

### الموجة 2 — ذكاء الروشتة والمخزون (أسبوع 3-5)
**Phase 7 — AI Prescription Analyzer**
- جدول `prescription_extractions` (medicine_name, dosage, quantity, confidence).
- OCR: **Lovable AI Gateway** مع `google/gemini-3-flash-preview` (Vision) — لا حاجة لـ Google Vision/Azure.
- `confidence < 80%` → ينتقل تلقائياً لـ `prescription_reviews`.
- تكامل مع `admin-rx-review` الحالي.
- KPI: 80% استخراج تلقائي.

**Phase 8 — AI Inventory Supervisor**
- Cron كل ساعة يحلل `branch_inventory + orders + transfers`.
- جدول `inventory_ai_alerts` (alert_type: low_stock | dead_stock | fast_moving).
- توصيات تحويل آلية (لا تنفّذ).

**Phase 9 — AI Transfer Optimizer**
- جدول `transfer_recommendations`.
- خوارزمية Demand Forecast (موفينج أفريج 7/30 يوم) + Current Stock.
- يُقترح فقط، التنفيذ يدوي عبر `admin-transfers`.

### الموجة 3 — التسويق الذكي (أسبوع 6-9) — الأعلى ROI
ترتيب من المؤثرين فوراً:

**14A — Customer Segmentation**
- جدول `customer_segments` (VIP, Dormant, New, Chronic).
- Cron يومي يحدّث `customer_scores` + `customer_profiles.segment`.

**14B — WhatsApp Retention Bot**
- `chronic_refill_predictor`: يحسب موعد نفاد الدواء المتكرر.
- يرسل تذكير قبل 5 أيام + زر "إعادة الطلب" (deep link).

**14C — Social Media Automation**
- Meta/Instagram عبر Graph API + Connector.
- Content Creator AI: ينتج منشورات يومية مرتبطة بالمخزون البطيء/العروض.
- جدول `social_posts` (platform, scheduled_at, status, asset_url).

**14D — Campaign Optimizer**
- يراقب `campaigns + discount_redemptions + orders`.
- يقرر: استمر / أوقف / زد الميزانية (proposal فقط — Approval gate).

**14E — AI Marketing Director (تجميعي)**
- وكيل مشرف يولّد `Marketing Executive Report` يومياً في `executive_reports`.
- لوحة `/admin-marketing-director`.

### الموجة 4 — تشغيل المؤسسة (أسبوع 10-12)
- **Phase 10**: Operations Director — `ai_daily_reports` (يجمع كل المؤشرات).
- **Phase 11**: Smart Branch Routing — `routing_decisions` لكل طلب.
- **Phase 12**: Voice AI Pharmacist (Twilio Voice + OpenAI Realtime) — اختياري.
- **Phase 13**: Enterprise Command Center — لوحة موحّدة `/admin-command-center`.

---

## القرارات التقنية الموحّدة
- **AI**: Lovable AI Gateway حصراً (`google/gemini-3-flash-preview` افتراضي، `gemini-3-pro` للمهام المعقدة).
- **Backend**: TanStack `createServerFn` + `/api/public/hooks/*` للـ cron.
- **Tools**: AI SDK `tool()` + `inputSchema` + `needsApproval` لكل عملية كتابة.
- **Audit**: كل قرار AI يُسجَّل في `agent_runs` + `agent_actions`.
- **Approval Gate**: لا وكيل يكتب في DB إنتاجياً دون موافقة الأدمن إلا للقراءة والإرسال.

---

## ما أقترح بدءه الآن
ابدأ بـ **الموجة 1 كاملة** (6C + 6D) لأنها:
1. تستفيد من البنية الجاهزة (Twilio + agent_actions + dispatch table).
2. أعلى أثر مباشر على رضا العميل.
3. تُغذّي بيانات لموجة التسويق (14B/14E).

**هل أبدأ تنفيذياً بـ Phase 6C كاملة (الأحداث الـ8 + retry + tracking webhook + KPI dashboard)؟**
