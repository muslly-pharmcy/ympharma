## Phase 9 + Phase 10 (Web) + Aden Doctors Seed

Three parallel work streams — all web-only, no mobile/desktop apps this round.

---

### 1. Phase 9 — Visitor Intelligence + AI Medical Content Engine

**Database (one migration):**
- `visitor_sessions` — visitor_token (uuid cookie), ip_hash (SHA-256), country, language, device, browser, pages_viewed jsonb, interests jsonb, first_visit, created_at, last_seen_at
- `medical_posts` — title, slug, category, content (markdown), summary, language (ar/en), tags jsonb, ai_generated, approved, published_at, publish_date, cover_image_url
- RLS: public SELECT on `medical_posts` where `approved=true`; `visitor_sessions` service_role only; admin can approve posts

**Server functions & routes:**
- `src/lib/visitor.functions.ts` — `trackVisitor()` on page-load: hashes IP, reads `accept-language` + `user-agent`, upserts session. Country from `cf-ipcountry` / `x-vercel-ip-country` headers (free, no external API). **No city, no consent banner needed** (per user's chosen minimum profile).
- `src/ai/content/medical-content-engine.ts` — generates a daily post via Lovable AI Gateway (Gemini 3 Flash) with weekly calendar rotation (Sun: awareness, Mon: heart, Tue: nutrition, Wed: dental, Thu: children, Fri: medication safety, Sat: fitness)
- `src/routes/api/public/ai/content-tick.ts` — cron endpoint, generates + inserts pending post
- `pg_cron` daily at 06:00 UTC

**UI:**
- `/admin-medical-content` — list pending/approved posts, approve/edit/reject
- `/health-tips` public route — approved posts listing, RTL Arabic-first
- `/health-tips/$slug` — single post with SEO head()

---

### 2. Phase 10 — Consent + Web Push + 72h Campaigns

**Web Push (VAPID):**
- Generate VAPID public/private keypair, store private via `secrets--generate_secret`, public as `VITE_VAPID_PUBLIC_KEY` in `.env`
- Install `web-push` npm package

**Database:**
- `push_subscriptions` — user_id nullable, visitor_token, endpoint, p256dh, auth, user_agent, active, subscribed_at
- `ai_campaigns` — name, frequency (`72_hours`|`weekly`|`daily`), content_type, target_rules jsonb, active
- `campaign_deliveries` — campaign_id, subscription_id, sent_at, opened_at, clicked_at (dedupe key)

**Client:**
- `src/lib/push/register-sw.ts` + `public/sw.js` service worker
- `PushOptInCard` component — appears after 20s or 3rd page-view (not intrusive), explains value, calls `Notification.requestPermission()`, subscribes with VAPID public key
- Stores subscription via server function

**Server:**
- `src/ai/engagement/notification-engine.ts` — sends via `web-push`, respects consent, logs deliveries, dedupes
- `src/ai/engagement/campaign-engine.ts` — smart frequency (new visitor: 7d, active: 3d, customer: 2d) reading from `campaign_deliveries.sent_at`
- `src/routes/api/public/engagement/dispatch.ts` — cron every 6h picks due subscribers + latest approved post + sends push
- `pg_cron` every 6 hours

**UI:**
- `/admin-campaigns` — CRUD campaigns, view delivery stats (sent/opened/clicked)

---

### 3. Aden Doctors & Hospitals Seed

**Migration (data seed via `INSERT` in migration since it's deterministic):**
- 7 hospitals into `hc_locations`: عدن الألماني الدولي، الأمريكي الحديث، الوالي، صابر التخصصي، البريهي، الجمهوري التعليمي، + one placeholder for المصلي itself
- Each with real phone (02-329700 etc.), address (المنصورة/كريتر), city="عدن", country="اليمن"
- Emergency number `195` stored in `app_settings` as `emergency_hotline`
- ~20 doctors into `hc_doctors` (from the list you provided): ناهد طاهر، عمر باقريب، عبد الفتاح السعيدي، قاسم الأصبحي، أمين السعدي، هدى باذيب، etc.
- Link via `hc_doctor_locations` (each doctor → their listed hospitals)
- Specialties in `hc_specialties`: تغذية علاجية، قلب وأوعية، عظام، مخ وأعصاب، باطنية وسكري، مسالك بولية، نساء وولادة
- Link via `hc_doctor_specialties`

**Note:** Doctor phone numbers explicitly NOT stored (per your source: "إدارة المستشفيات تمنع نشر أرقام الهواتف الشخصية"). Contact goes via hospital switchboard which is on the location row.

---

### Out of scope this round
- Mobile apps (Android/iOS)
- Desktop app (Electron)
- Email/WhatsApp channels (already exist as separate systems)
- Full geo-IP city detection + consent banner
- Multi-language auto-translation of posts (posts written in AR/EN, user picks language per post)

### Deliverables
- 3 migrations (visitor+content, push+campaigns, Aden seed)
- ~15 new TS files under `src/ai/engagement/`, `src/ai/content/`, `src/lib/`, `src/routes/api/public/`
- 4 new admin routes + 2 public routes
- 1 service worker + 1 opt-in component
- 2 pg_cron jobs (content daily 06:00, dispatch every 6h)
