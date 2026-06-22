# خطة تنفيذ الميزات الأربع (مرحلية وآمنة)

النطاق كبير جداً لتنفيذه دفعة واحدة دون كسر الكود القائم. سأنفذ على 4 مراحل، كل مرحلة قابلة للاختبار وحدها قبل الانتقال للتالية.

## المرحلة 1 — نظام الإشعارات الداخلي (الأسرع، الأقل مخاطرة)

**قاعدة البيانات** (migration واحد):
- جدول `notifications` (user_id, type, title, body, priority, read, read_at, metadata, created_at)
- RLS: المستخدم يرى/يحدّث إشعاراته فقط؛ `service_role` يكتب
- GRANTs قياسية

**الكود**:
- `src/lib/notifications.functions.ts` — server fns: `listMyNotifications`, `markAsRead`, `markAllAsRead`, `getUnreadCount` (مع `requireSupabaseAuth`)
- `src/components/notifications-bell.tsx` — أيقونة مع badge للعدد غير المقروء
- `src/routes/_authenticated/notifications.tsx` — صفحة العرض
- helper داخلي `createNotification()` يستخدم `supabaseAdmin` من server fns الأخرى

## المرحلة 2 — نظام الولاء والنقاط

**قاعدة البيانات**:
- `loyalty_accounts` (phone_number unique, points, tier, total_spent_yer)
- `loyalty_transactions` (phone_number, points, type ∈ earned/redeemed/bonus/expired, description, order_id)
- دوال PG: `add_loyalty_points(_phone, _points, _spent)`, `redeem_loyalty_points(_phone, _points)`, `recompute_loyalty_tier(_phone)` (SECURITY DEFINER)
- العتبات: bronze < 10K، silver ≥ 10K، gold ≥ 25K، platinum ≥ 50K (ر.ي)
- RLS + GRANTs

**الكود**:
- `src/lib/loyalty.functions.ts` — `getMyLoyalty`, `getMyTransactions`, hooks للإكساب/الاسترداد (admin only)
- `src/routes/_authenticated/loyalty.tsx` — لوحة العميل (الرصيد، المستوى، السجل)
- ربط بسيط في `orders` عبر trigger يستدعي `add_loyalty_points` عند `status='delivered'`

## المرحلة 3 — نظام الوصفات الذكي (تحليل صورة بـ AI)

**ملاحظة**: الجداول الحالية موجودة (`prescriptions`, `prescription_extractions`, `prescription_files`, `agent_approval_requests`). نضيف فقط طبقة AI vision.

**الكود**:
- `src/lib/prescription-intelligence.server.ts` — دالة `analyzePrescriptionImage(imageUrl)` تستخدم AI Gateway مع `google/gemini-3-flash-preview` (multimodal vision) + Zod schema للنتيجة + تطابق المخزون
- `src/lib/prescription-intelligence.functions.ts` — `analyzePrescription` server fn (admin only, requires role check via `has_role`)
- تحديث `src/components/admin/PrescriptionsTab.tsx` — زر "تحليل بالذكاء الاصطناعي" يعرض الأدوية المستخرجة والمفقودة من المخزون
- يُنشئ approval request تلقائياً عند موافقة المراجع

## المرحلة 4 — إعادة هيكلة Clean Architecture لـ WhatsApp Agent

**النطاق المحدود** (لا نلمس بقية المشروع):
- `src/lib/whatsapp/domain/` — entities (Product, Conversation), value objects (PhoneNumber, Money, StockQuantity)
- `src/lib/whatsapp/application/` — use cases منفصلة (SearchProductsUseCase, CheckStockUseCase, CreateApprovalUseCase) + interfaces (IProductRepo, IConversationRepo, IAiService)
- `src/lib/whatsapp/infrastructure/` — تنفيذات Supabase + Lovable AI
- `src/lib/whatsapp/shared/` — DomainError, ApplicationError, Logger
- `src/lib/whatsapp/di.ts` — حاوية بسيطة
- إعادة كتابة `src/lib/whatsapp-ai-agent.server.ts` ليصبح adapter رفيع يستدعي use cases
- **الحفاظ على نفس التوقيع العام** (`runWhatsAppAgent` و `AgentResult`) كي لا تنكسر `whatsapp-webhook.ts`
- اختبارات وحدة لكل use case بـ mock repositories

## القرارات التقنية المهمة

- لا أستخدم `process.env.LOVABLE_API_KEY` على مستوى الموديول في `.functions.ts` — أقرأه داخل `.handler()` فقط
- لا أستورد `client.server` في `.functions.ts` على مستوى الموديول — `await import(...)` داخل الـ handler
- جميع الجداول الجديدة تحتوي GRANTs قياسية + RLS
- جميع الـ admin server fns تتحقق من `has_role(auth.uid(), 'admin')`
- AI vision سيستخدم endpoint `chat/completions` مع `image_url` block (multimodal)
- صفحات `_authenticated` فقط — لا حماية على routes عامة

## التحقق بعد كل مرحلة

- بناء المشروع ينجح (TypeScript strict)
- الاختبارات الموجودة تستمر بالنجاح (`whatsapp-reply-format.test.ts` وغيرها)
- لا تغيير في سلوك الـ webhook الحالي

## ما هو خارج النطاق (لن أنفذه)

- التوصيات متعددة المستويات (يفترض أعمدة `sales_count`, `popularity`, `category` غير موجودة)
- البث المباشر للمخزون (`stock_subscriptions` جدول جديد كامل)
- نظام التقييمات بالصور
- تحليلات SEO الإضافية
- لوحة تحكم Recharts الجديدة (الموجود `dashboard-charts.tsx` يكفي)

هل أبدأ بالمرحلة 1 (الإشعارات)؟ أم تفضل ترتيباً مختلفاً؟
