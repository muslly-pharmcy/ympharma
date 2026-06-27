## رأيي الصريح في v17.0

**التقييم: blueprint جميل أكاديمياً، لكن 80% منه لا يناسب مشروعك الحالي.**

### الواقع الحالي للمشروع
- TanStack Start على Cloudflare Workers + Supabase واحد
- مستخدم واحد (أنت) + فريق صغير
- لا يوجد Kafka، لا multi-tenant، لا multi-region، لا فرق متعددة
- النظام يعمل ويخدم سوقاً واحداً (اليمن)

### ما في الـ blueprint لا يمكن أو لا يجب تنفيذه

| البند | لماذا لا |
|---|---|
| 1. Schema Registry (Confluent) | لا يوجد Kafka. Confluent منتج منفصل بآلاف الدولارات/شهر |
| 5. Kafka Partition Strategy | **لا يوجد Kafka أصلاً** — pg_net + cron فقط |
| 8. ClickHouse/Elasticsearch/Vector DB | ثلاث بنى تحتية جديدة لا نملكها؛ Postgres FTS + pgvector يكفيان |
| 11. Tenant Encryption (Master→Tenant→Field) | **لا يوجد multi-tenant**؛ مشروع single-tenant |
| 12. Data Residency (4 مناطق AWS) | Cloudflare Workers يحدد الموقع تلقائياً؛ لا AWS |
| 17. Pact Contract Testing | لا يوجد services منفصلة لتختبر عقودها |
| 18. Service Catalog/Scaffolding | فريق واحد، خدمة واحدة — لا حاجة لـ Backstage |
| المجلد `platforms/` بـ 17 منصة | كل ما في المشروع `src/` واحد — إعادة الهيكلة بهذا الحجم = إعادة كتابة كاملة |

### ما في الـ blueprint يستحق التنفيذ فعلاً (مُكَيَّف على الواقع)

| # | البند | لماذا يناسب الآن |
|---|---|---|
| 6 | **DLQ Replay Engine** | لدينا `agent_events_dlq` بالفعل بدون UI لإعادة المعالجة |
| 7 | **Event Retention Policy** | لدينا `error_logs_archive` و`uptime_incidents_archive` بدون سياسة منظمة |
| 10 | **Idempotency Keys** | webhooks الحالية (n8n, whatsapp, twilio) معرضة لرسائل مكررة |
| 14 | **AI Safety Layer (مبسّط)** | لدينا `ai-chat`, prescriptions, voice-pharmacist — حماية الإدخال/الإخراج قيمة |
| 16 | **Backup Verification** | لدينا جدول `backups` لكن لا نتحقق من سلامتها |

### اعتراضات تقنية على الكود نفسه (حتى لو طبقنا)

1. **`get_next_sequence`** يستخدم `SELECT MAX()` بدون قفل — race condition مؤكد. يجب استخدام `Postgres SEQUENCE`.
2. **`replaceAll(/delete/i, ...)`** في AI Sandbox = حماية وهمية تكسر استعلامات طبية شرعية ("الجرعة المحذوفة من الوصفة").
3. **`crypto.randomBytes` و`createCipheriv`** — Cloudflare Workers لا يدعم `node:crypto` بشكل كامل؛ يجب Web Crypto API.
4. **`setInterval` للنسخ الاحتياطي** — Workers stateless؛ لا يعمل. يحتاج `pg_cron`.
5. **Idempotency table بدون TTL/cleanup** — ينمو بلا حد.

### اقتراحي

نفذ **5 بنود فقط** بشكل واقعي ومحكم بدلاً من 18 سطحياً:

**Phase A (هذه الجلسة):**
1. **Idempotency middleware** للـ `/api/public/hooks/*` (جدول + cleanup cron + Web Crypto)
2. **DLQ Replay UI** على `/admin-event-bus` (زر إعادة محاولة + bulk replay محدود)
3. **Retention policy موحدة** — function `apply_retention_policy()` تنقل من جداول `*_archive` إلى Supabase Storage بعد N يوم، وتحذف بعد M يوم، مع cron يومي

**Phase B (جلسة لاحقة):**
4. **AI Safety**: PII redactor + injection detector فقط (بدون regex naive)، يُسجّل المحاولات في `operations_alerts_v14`
5. **Backup verification**: server fn يقرأ آخر backup من Storage، يفك ضغطه، يعدّ الصفوف، يقارن مع جدول `backups.expected_rows`

**ما لن ننفذه:** كل ما يحتاج Kafka/ClickHouse/Vault/Backstage/multi-region/multi-tenant. سنعيد طرحه عندما يصبح المشروع متعدد المستأجرين فعلاً.

### القرار المطلوب منك

اختر واحداً:
- **A**: نفّذ Phase A الآن (3 بنود واقعية، migration واحد + 3-4 ملفات)
- **B**: نفّذ Phase A + B (5 بنود، أكبر)
- **C**: عدّل الاختيار — اذكر أي بنود من الـ 18 تريدها صراحة وسأقول أيها قابل للتنفيذ على البنية الحالية
- **D**: لا تنفذ شيئاً، فقط احفظ هذا التقييم كـ ADR في `docs/`
