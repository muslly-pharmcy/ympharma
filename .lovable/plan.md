## Pharmacy Intelligence Platform — Build Plan

Infrastructure is green. Before I start shipping new revenue features I must close the **critical security findings** the scanner just surfaced — they directly threaten the same revenue this phase is trying to grow (anyone on the internet can drain WhatsApp credits, trigger AI enrichment, and burn API budget).

I'll do this in 3 waves. Each wave is independently shippable and produces evidence.

---

### Wave 0 — Security Hardening (BLOCKER, ~1 short batch)

Without this, every cron endpoint we add in later phases inherits the same hole.

- Replace `apikey === SUPABASE_PUBLISHABLE_KEY` checks on `nightly-intel`, `weekly-ai-enrich`, `weekly-exec-report`, `incident-check`, `alerts-worker` with a server-only `CRON_SECRET` + HMAC-SHA256 (same pattern as `uptime-webhook.ts`).
- Add Meta `X-Hub-Signature-256` verification to `whatsapp-webhook` using `WHATSAPP_APP_SECRET`.
- Rotate `pg_cron` jobs to send the new signed header.
- Remove `discount_code` from the public `campaigns` SELECT exposure (use a security-barrier view).
- Add the two missing secrets via `add_secret` (`CRON_SECRET`, `WHATSAPP_APP_SECRET`).

Evidence: scanner re-run shows the 3 `error` findings cleared.

---

### Wave 1 — Master Taxonomy + Condition-First Shopping (Phases 1 & 2)

The existing `product_classifications` table already covers most of the 9 axes (generic, ingredient, therapeutic_category, pharmacological_class, conditions, is_chronic, requires_prescription). Gaps to add:

- `dosage_form` enum (tablet, syrup, injection, cream, drops, inhaler, suppository, sachet)
- `age_group` enum (infant, child, adult, elderly, all)
- `gender_relevance` enum (all, female, male)
- Backfill via a one-shot AI enrichment job over published products with no/low confidence rows.

UI:
- New `/conditions` route + `/conditions/$slug` (diabetes, hypertension, asthma, allergies, flu, cold, gastritis, pregnancy, pediatrics) driven by `conditions` array in `product_classifications`.
- Home gets a "تسوّق حسب الحالة" strip above the current category grid.

Evidence: condition pages render ≥10 real products each from production data.

---

### Wave 2 — AI Health Navigator + Smart Product Pages (Phases 3 & 5)

- `/health-navigator` route: free-text Arabic input → Lovable AI Gateway (Gemini Flash) with a strict system prompt: NEVER diagnose, NEVER prescribe, only map symptom → conditions → OTC products from our catalog (gated by `requires_prescription=false`). Tool-call style response listing condition tags + legacy_ids it found in our DB.
- Product page upgrade (`/product/$id`): show active ingredient, therapeutic class, conditions treated, alternatives (same active ingredient), complementary (from `pharmacy_related_products` RPC + co-purchase).

Evidence: 5 sample queries return only real catalog products; product page screenshots show all 6 panels populated.

---

### Wave 3 — Chronic Care + Revenue Engine + Exec Intel (Phases 4, 6, 7)

- `/chronic/$program` pages (diabetes / hypertension / heart / asthma) with auto-applied discount code, WhatsApp refill-reminder opt-in, and a "subscribe monthly" CTA that creates a recurring `marketing_queue` job.
- Auto-bundle generator: nightly SQL job over `orders.items` to compute top co-purchase pairs/triples by lift, write proposals into `bundles` table with `is_active=false` for staff approval.
- CEO dashboard additions on `/admin-command`:
  - Revenue by disease category (week vs prev week, % change)
  - Declining products (4-week trend, p-value)
  - Chronic patients overdue for refill (using `days_between_orders`)
  - Suggested next campaign (highest-ROI segment from `customer_profiles`)

Evidence: SQL snapshots + screenshots from production data.

---

### Out of scope for now

- No payment gateway changes.
- No new auth flows.
- No mobile-app changes.

---

### Decisions I need from you

1. **Go-order**: do Wave 0 first (recommended — security is a hard blocker), then 1 → 2 → 3? Or batch Wave 0 + Wave 1 together?
2. **AI model for Navigator**: stay on `google/gemini-3-flash-preview` (cheap, fast, current default) or upgrade to a stronger model for symptom mapping?
3. **Chronic discount %**: what auto-discount should the chronic programs apply (current campaigns use 10%)?
