## الخطة

تحديث سرّين فقط في الـ Backend Secrets، دون أي تغييرات في الكود.

### الخطوات
1. فتح نموذج آمن لإدخال قيمتي:
   - `DEEPSEEK_API_KEY` — مفتاح DeepSeek الفعلي (يبدأ بـ `sk-...`)
   - `N8N_WEBHOOK_URL` — `https://muslly.app.n8n.cloud/webhook/social-publish`
2. ستدخل القيم الحقيقية في النموذج (لا تُلصق في الدردشة).
3. بعد الحفظ، يصبحان متاحَين فوراً لكل الـ server functions / cron / hooks الموجودة (`run-social-posts`, `social-callback`, `collect-social-stats`).

### ملاحظات مهمة
- **Supabase** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) مُدارة تلقائياً عبر Lovable Cloud — لا تُلمس ولا تحتاج إعداداً.
- **`CRON_SECRET`** و **`N8N_CALLBACK_SECRET`** موجودان بالفعل من الخطوات السابقة — لا حاجة لإعادة إنشائهما. إن أردت تدويرهما لاحقاً، أخبرني.
- بعد الحفظ، ينصح بالضغط على زر "توليد الآن" في `/admin-social-posts` للتأكد من نجاح الاتصال بـ DeepSeek و n8n.