## الخطة

### 1) تشخيص 503 (proxy-worker2)
أخطاء 503 صادرة من طبقة Cloudflare proxy للموقع المنشور، ليست من كودك. الإجراء:
- **أنت** تضغط "Publish" / "Redeploy" من Lovable لإعادة نشر الـ Worker.
- بعدها أتحقق بـ `curl` من `/api/public/health` و `/api/public/hooks/prescription-extract` وأقرأ worker logs لتأكيد الحل.
- إن استمر الخطأ، أفحص `supabase--cloud_status` + `supabase--db_health` + سجلات الـ worker لتحديد ما إذا كان السبب DB أو bundle init.

### 2) تطبيق توصيات التدقيق (Section C)
- **تعريف `titans-stars-bg`**: التحقق من `src/styles.css` — مذكور في الذاكرة أنه مُضاف فعلاً ضمن `.titans-scope`، سأتأكد وأضيفه فقط إن كان ناقصاً.
- **`prefers-reduced-motion` في `ParticleBackground`**: إضافة فحص `window.matchMedia("(prefers-reduced-motion: reduce)")` للخروج مبكراً.
- **endpoint اختياري للنموذج**: إنشاء `src/routes/api/public/contact.ts` يستقبل POST، يتحقق بـ Zod، ويخزّن في جدول جديد `contact_messages` (مع RLS + GRANTs)، ثم تحديث `src/routes/contact.tsx` لإرساله للـ endpoint بدل `mailto` فقط (مع fallback).

### 3) شعار المصلي الجديد (الذهبي)
الصور المرفقة هي شعار. هل تريد:
- (أ) استبدال اللوجو الحالي في الـ header بالنسخة الذهبية الجديدة؟ أم
- (ب) تركها كمرجع فقط؟

أحتاج تأكيدك قبل لمس الـ branding.

### تفاصيل تقنية
- جدول `contact_messages(id, name, email, message, created_at)` — RLS مفعّل، INSERT للجميع (anon+authenticated)، SELECT للأدمن فقط عبر `has_role`.
- لن أعدّل `src/integrations/supabase/*` ولا `supabase/config.toml`.
- لن أكتب workaround للـ 503 في كود التطبيق — السبب بنية تحتية، الحل redeploy.

### أسئلة قبل التنفيذ
1. اللوجو الذهبي الجديد: استبدال في الـ header، أم مرجع فقط؟
2. endpoint التواصل: تخزين DB + بريد، أم DB فقط؟
