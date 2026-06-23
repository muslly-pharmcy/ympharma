## نظام الترويج اليومي الآلي (DeepSeek + n8n)

### النطاق
توليد منشورات يومية لـ Facebook / Instagram / Twitter / Telegram عبر DeepSeek، إرسالها إلى n8n webhook للنشر، حفظ كل منشور في قاعدة البيانات، ولوحة admin لعرضها ومراقبتها.

### الأسرار المطلوبة
- `DEEPSEEK_API_KEY` (مفتاح DeepSeek)
- `N8N_WEBHOOK_URL` (رابط Webhook الخاص بك من n8n)
- `INTERNAL_CRON_SECRET` (سيُولّد تلقائياً، لحماية endpoint الجدولة)

سأطلبها بـ add_secret بعد الموافقة.

### قاعدة البيانات (migration واحد)
جدولان جديدان مع GRANT + RLS:
- `social_posts`: platform, product_id (FK→products), caption, hashtags[], cta, status (pending/published/failed), external_id, scheduled_for, published_at, error_message
- `social_post_stats`: post_id (FK), likes, comments, shares, views, collected_at

RLS مُحكم: SELECT/UPDATE/DELETE فقط لـ `has_role(auth.uid(),'admin')` أو `'owner'` (مطابق لبقية المشروع). INSERT عبر service_role من server functions فقط. GRANT لـ authenticated + service_role (لا anon).

### الكود الجديد

**1. `src/lib/deepseek.server.ts`** — عميل DeepSeek (server-only، يقرأ `process.env.DEEPSEEK_API_KEY` داخل الدالة، لا على المستوى الأعلى).

**2. `src/lib/social-content.server.ts`** — `generateProductPost`, `generateGeneralPost`, `pickRandomProduct` (اختيار مرجح حسب stock، يستخدم publishable-client للقراءة العامة).

**3. `src/lib/social-publisher.server.ts`** — `publishToN8n(post)` مع timeout + retry، `markPublished/markFailed`.

**4. `src/lib/social.functions.ts`** (client-safe) — server functions محمية بـ `requireSupabaseAuth` + فحص has_role:
- `listSocialPosts({ limit, status })`
- `regenerateDailyPostsNow()` — لزر "توليد الآن" في اللوحة
- `publishPostNow({ id })` — لزر "نشر الآن"
- `retryFailedPost({ id })`

**5. `src/routes/api/public/hooks/run-social-posts.ts`** — endpoint للـ cron:
- يتحقق من `Authorization: Bearer ${INTERNAL_CRON_SECRET}` (ليس apikey فقط، لأن apikey لا يثبت أنه cron)
- يستدعي `generateDailyPosts()` ثم `publishToN8n()` لكل منشور
- يُحدّث الحالة في `social_posts`
- يحمّل `supabaseAdmin` ديناميكياً داخل الـ handler (لأن route files تذهب لـ client bundle عند top-level import)

**6. `src/routes/_authenticated/admin-social-posts.tsx`** — لوحة admin:
- مغلّفة بـ `<AdminGate>` (server-side has_role check)
- جدول المنشورات الأخيرة مع badge للحالة، الكابشن، الهاشتاغات، CTA
- أزرار: "توليد منشورات الآن"، "نشر الآن" (للحالة pending)، "إعادة محاولة" (للحالة failed)
- إحصائيات (likes/comments/shares/views) من `social_post_stats` عند توفرها
- استدعاء عبر `useServerFn` + `useQuery` (لا call مباشر من loader في route عام)

**7. إضافة رابط في الـ admin sidebar/menu** (لا يوجد ملف مركزي ظاهر؛ سأضيف صف في `admin.tsx` index list).

### الجدولة (insert tool، ليس migration)
```sql
SELECT cron.schedule(
  'daily-social-posts',
  '0 8 * * *',
  $$ SELECT net.http_post(
    url := 'https://ympharma.lovable.app/api/public/hooks/run-social-posts',
    headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.cron_secret'))
  ); $$
);
```
(سأضبط `app.cron_secret` GUC أو أمرّر القيمة مباشرة في الـ SQL.)

### اختلافات مهمة عن البروميت الأصلي
| البروميت | الخطة | السبب |
|---|---|---|
| `supabaseAdmin` top-level في route file | `await import()` داخل handler | route files جزء من client bundle |
| RLS: `auth.role()='authenticated'` | `has_role(auth.uid(),'admin'\|'owner')` | البروميت يفتح البيانات لأي مستخدم مسجل |
| `apikey` header للـ cron | `Bearer INTERNAL_CRON_SECRET` | `/api/public/*` يتجاوز auth؛ نحتاج توقيع حقيقي |
| كود JSX مكسور في الـ admin page | JSX سليم مع shadcn components | البروميت كان غير مكتمل |
| `DEEPSEEK_API_KEY` في `.env` | secret عبر add_secret | المعيار المعتمد |
| `n8n` يستقبل كل المنشورات في طلب واحد | طلب منفصل لكل منصة | يبسّط workflow في n8n ويسمح بإعادة المحاولة الفردية |

### خطوات التنفيذ (بعد الموافقة)
1. طلب `DEEPSEEK_API_KEY` و `N8N_WEBHOOK_URL` عبر add_secret؛ توليد `INTERNAL_CRON_SECRET`.
2. تشغيل migration للجداول + RLS + GRANT.
3. إنشاء ملفات الكود (6 ملفات + تعديل admin index).
4. تشغيل `cron.schedule` عبر insert tool.
5. التحقق: استدعاء يدوي للـ endpoint + فتح `/admin-social-posts` لرؤية المنشورات.

### خارج النطاق
- بناء n8n workflow نفسه (أنت ستجهزه وتوفر URL).
- جمع إحصائيات التفاعل تلقائياً (يحتاج webhooks عكسية من n8n؛ نتركها للمرحلة 2 — الجدول جاهز لاستقبالها).
- TikTok (سنضيفه لاحقاً).