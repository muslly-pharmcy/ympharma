# Strategic Takeover Plan — My Pharmacy Online (muslly.com)
**Owner mindset. $10M at risk. Goal: #1 digital pharmacy in Yemen within 24 months.**
Date: 2026-06-19 · Author: Acting CEO/CTO/COO/CISO/Growth

---

## PHASE 1 — BRUTAL BUSINESS AUDIT

Evidence references real files in this repo. Findings are ranked by money-at-risk.

### Revenue leaks
| # | Leak | Evidence | Monthly $ at risk (est.) |
|---|---|---|---|
| R1 | **No upsell / cross-sell at cart.** Customers buy 1 item and leave. | `src/routes/cart.tsx` has no "frequently bought together", no "add for free shipping at X ر.ي". | 15–25% AOV uplift forfeited. |
| R2 | **No abandoned-cart recovery.** Cart lives only in `localStorage` (`src/lib/cart.tsx`); no server-side cart, no WhatsApp ping. | `cart.tsx` — `useEffect` writes to localStorage only. | 10–20% of carts recoverable @ ~30% conversion. |
| R3 | **No min-order threshold or delivery fee tiering.** Tiny orders cost more to deliver than they earn. | `place_order` RPC computes `total` from items only. | Margin bleed on every <3 000 ر.ي order. |
| R4 | **Prescription queue → no automated quote-back.** Staff must WhatsApp each customer; many never convert. | `src/components/admin/PrescriptionsTab.tsx` is manual. | 30–50% of Rx submissions silently die. |
| R5 | **No "out of stock → notify me".** Customer leaves, never comes back. | Product page (`src/routes/product.$id.tsx`) has no waitlist. | Every OOS view = lost intent. |
| R6 | **No insurance-claim monetization.** `insurance.tsx` exists but no margin model. | `src/lib/insurance.functions.ts`. | Untapped B2B revenue. |

### Profit leaks
- **P1** Image bandwidth: `prescription_image_blobs` stores raw `bytea` — doubles storage cost vs. lifecycle-tiered object storage. Mitigate by moving blobs >90 days to cold storage.
- **P2** AI Gateway usage uncapped per session (`src/lib/ai-assistant.functions.ts` has no per-IP/user budget). One viral TikTok = $$$ in tokens.
- **P3** Daily DB backup builds one `jsonb_agg` per table → CPU spike; will become the most expensive query in 6 months.
- **P4** WhatsApp Cloud API messages are fire-and-forget — failures aren't retried, but successes aren't cost-tracked either.

### Operational inefficiencies
- **O1** Staff have **no notification** when a new order or Rx arrives — they refresh the admin panel. Already flagged as M-4 in red-team test.
- **O2** No SLA timer on prescriptions. Customer doesn't know if they'll wait 5 min or 5 hours.
- **O3** No driver-dispatch view. Orders go from "pending" to "delivered" with no intermediate state owned by a delivery person.
- **O4** No inventory in the DB. `public.products` was just seeded with prices; **there is no `stock_qty` column**. Staff can sell phantom inventory.
- **O5** No daily cash-reconciliation report.

### Customer acquisition weaknesses
- **CA1** SEO: only ~5 indexable pages with unique metadata. Competitors with 200 indexed product pages will outrank.
- **CA2** No referral mechanism (no `referral_code` table, no `discount_codes`).
- **CA3** No WhatsApp opt-in capture during browsing — only at checkout.
- **CA4** No paid-ad landing pages; every campaign would dump traffic on `/`.

### Retention weaknesses
- **RT1** No customer account. Re-ordering requires re-typing name, phone, address. (`place_order` takes a `_customer` blob each time.)
- **RT2** No order history visible to the customer beyond a single tracking id.
- **RT3** No loyalty / points / tier program.
- **RT4** No "reorder in 30 days" automation for chronic-medication customers (diabetes, hypertension = the highest-LTV segment).

### Conversion bottlenecks
- **CB1** Prescription upload requires name + phone + address before the customer sees a price → 50%+ drop-off.
- **CB2** No guest "ETA" shown at cart — customer doesn't know when they'll get it.
- **CB3** Cash-on-delivery vs. prepayment choice missing → all the risk sits on the pharmacy.

### Inventory weaknesses
- See O4. Also: no supplier table, no PO workflow, no expiry-date tracking (critical for pharmacy regulation).

### Competitive weaknesses
- No moat on the catalog (any competitor can scrape `products.json`).
- No moat on Rx processing — manual.
- Brand: muslly.com has no differentiated visual or service promise visible on home page.

---

## PHASE 2 — GROWTH ENGINE (12-month roadmap to 2× orders + 2× repeat rate)

### Lever 1 — Bundles (Week 2)
Create `product_bundles` table. Launch 8 bundles:
- "Cold & Flu Kit" — paracetamol + vitamin C + zinc → 15% off vs. à-la-carte
- "Diabetes Monthly" — metformin + glucose strips + lancets
- "Baby Care Starter", "First Aid Home", "Ramadan Wellness", "Pregnancy Essentials", "Elderly Daily", "Travel Kit"
Target: +18% AOV.

### Lever 2 — Promotions engine (Week 3)
Add `discount_codes` table (code, % or flat, min_total, max_uses, expires_at, first_order_only). Wire into `place_order` RPC server-side (never client-side).
First campaigns:
- `WELCOME10` first-order 10%
- `FREESHIP3000` free delivery > 3 000 ر.ي
- `RX20` 20% off any prescription medication

### Lever 3 — Loyalty (Month 2)
"Muslly Points" — 1 point per 100 ر.ي spent, 100 points = 500 ر.ي off. Stored in `loyalty_balances` table keyed by phone number. Expected +25% repeat rate.

### Lever 4 — WhatsApp automation (Month 1)
Six automated flows via WhatsApp Cloud API:
1. **Order confirmation** (already partial)
2. **Out-for-delivery** with driver name + ETA
3. **Delivered** + 1-tap review prompt
4. **Abandoned-cart** at +1h (only if WhatsApp opt-in)
5. **Rx quote** within 15 min SLA — auto-message "your prescription is being reviewed"
6. **Reorder reminder** at day 25/55/85 for chronic meds

### Lever 5 — Retention campaigns (Month 2)
Segment by `last_order_at`:
- 30 days idle → 10% off WhatsApp
- 60 days idle → free delivery
- 90 days idle → "we miss you" + 15% off

### Lever 6 — AOV nudges (Week 4)
Cart-page widgets: "Add 350 ر.ي for free delivery"; "Frequently bought together"; "Pharmacist tip: pair with…".

### KPI targets (12 months from launch)
| KPI | Today | Target |
|---|---|---|
| Orders / month | 1× | 2× |
| Repeat customer rate | unknown (~10–15% est.) | 35% |
| Conversion (visit → order) | ~1.5% | 3.5% |
| AOV | baseline | +30% |
| Prescription throughput | manual | 5× via automation |

---

## PHASE 3 — AI COWORKER ORGANIZATION

Ten always-on agents, each implemented as a `createServerFn` + cron (`/api/public/cron/<agent>`), with results posted to an `agent_runs` table and a Slack/WhatsApp channel for staff.

| Agent | Responsibility | KPIs | Reports | Automation |
|---|---|---|---|---|
| **CEO Agent** | Daily P&L digest, anomaly detection, weekly strategy memo. | Revenue Δ, margin Δ, NPS, runway. | Daily 08:00 WhatsApp to owner. | Triggers other agents on red flags. |
| **CTO Agent** | Tracks build health, error rate, p95 latency, DB size. | Error rate <0.1%, p95 <800 ms. | Hourly status page; daily digest. | Auto-files GitHub issues on regressions. |
| **IT Agent** | Backup verification, key rotation reminders, cert expiry. | Backup success 100%, secret age <90 d. | Weekly. | Auto-restart on health-check fail. |
| **Security Agent** | Re-runs RLS scan, watches `error_logs` for attack patterns, monitors `tracking_lookups` rate-limit hits. | 0 critical findings open. | Daily. | Auto-blocks IPs with >100 rate-limit hits/hr. |
| **Sales Agent** | Identifies stalled prescriptions, drafts WhatsApp follow-ups for staff to approve. | Rx → order conversion, response time. | Per-shift summary. | Auto-drafts quote messages. |
| **Marketing Agent** | Generates weekly bundle recs, picks promo codes, drafts WhatsApp blasts. | CTR, redemptions, ROAS. | Weekly. | Auto-schedules WhatsApp broadcasts. |
| **Inventory Agent** | Watches stock_qty, predicts depletion, drafts POs. | OOS rate <2%, expiry waste <3%. | Daily 07:00. | Auto-emails suppliers when below reorder point. |
| **Operations Agent** | Routes deliveries, calculates driver workload, flags SLA breaches. | On-time delivery %, avg time-to-deliver. | Live. | Auto-dispatches drivers via WhatsApp. |
| **Customer Experience Agent** | Reads reviews, surveys, support chats; sentiment + theme analysis. | CSAT, NPS, first-response time. | Weekly. | Auto-tags + routes complaints. |
| **Business Intelligence Agent** | Cohort, LTV, churn, RFM segmentation, what-if pricing. | Cohort retention, LTV/CAC. | Weekly board pack. | Powers other agents' decisions. |

All agents share one infrastructure: `agent_runs (id, agent, started_at, finished_at, status, summary jsonb)`; UI tab in admin.

---

## PHASE 4 — EXECUTIVE DASHBOARD (`/admin/exec`)

Single screen, mobile-first (owner checks on phone). Six tiles + one action list.

```
┌─────────────────────────────────────────────────────┐
│ Today: 14 orders · 312 k ر.ي · 6 Rx pending        │
├─────────────────────────────────────────────────────┤
│ [What is broken]      [What is growing]             │
│  • Rx SLA: 2 breached  • Diabetes bundle +47% WoW   │
│  • Driver Ali offline  • Repeat rate 18%→22%        │
├─────────────────────────────────────────────────────┤
│ [What is slowing]      [What is losing money]       │
│  • Checkout latency↑   • Free delivery <2 000 ر.ي   │
│  • Search → cart 0.8%  • OOS phantoms: 3 items      │
├─────────────────────────────────────────────────────┤
│ [What is making money] [Action today]               │
│  • Top SKU: Panadol    1. Approve 2 Rx quotes       │
│  • Insurance B2B +12%  2. Restock metformin         │
│                        3. Call customer #AM-…       │
└─────────────────────────────────────────────────────┘
```

Data sources: `admin_stats()`, new `exec_kpis()` RPC (revenue / margin / orders / Rx / CSAT in one call), `agent_runs` for the action list.

---

## PHASE 5 — AUTONOMOUS OPERATIONS

Map of manual → automated:

| Manual today | Automation | Trigger |
|---|---|---|
| Staff reads each Rx and quotes by hand | AI pre-extracts drug names + suggested SKUs; pharmacist only approves | On `prescriptions` INSERT |
| Staff watches for new orders | Sound + WhatsApp ping to staff group | DB trigger → `notify_staff()` |
| Staff manually messages "out for delivery" | Auto WhatsApp on status change | `orders.status` change |
| Staff guesses stock | `stock_qty` decremented on order, alert at reorder point | After `place_order` |
| Staff calls supplier | Auto-email PO when threshold crossed | Daily cron, Inventory Agent |
| Staff chases abandoned cart | Auto-WhatsApp at +1 h if opted in | `carts.updated_at` cron |
| Staff sends reorder reminder | Auto WhatsApp at day 25 for chronic SKUs | Daily cron |
| Staff writes weekly report | BI Agent generates PDF every Sunday | Weekly cron |
| Staff fixes bad images | Image-quality AI auto-flags blurry / non-Rx uploads | On upload |
| Staff replies to "is X in stock?" | Public stock API + AI chat answers | Live |

---

## PHASE 6 — COMPETITIVE ADVANTAGE (moats competitors can't copy by scraping the site)

1. **Proprietary Rx-to-Quote AI** trained on Yemeni drug names, dosages, handwriting (Arabic + English). Data flywheel: every approved quote improves the model.
2. **Pharmacist-in-the-loop workflow** with measured SLA — competitors will scrape the catalog, not the process.
3. **Chronic-medication retention engine** — once a diabetic customer is on Muslly's reorder cadence, switching cost is high.
4. **WhatsApp ops graph** — driver dispatch, customer comms, supplier POs all in one verified WhatsApp Business number. Reputation + verified status is hard to replicate.
5. **Insurance B2B integration** — direct claim adjudication with the top 3 Yemeni insurers is a contract moat, not a code moat.
6. **Trust signals**: licensed-pharmacist photo, license number, real reviews tied to verified order ids.
7. **YemenNet-grade offline resilience** (`orders-pending`, `rx-pending`, service worker, retry) — already built; competitors on stock Shopify will lose orders during outages.

---

## PHASE 7 — SCALING TO 100×

Today's bottlenecks at 100× (10 k orders/day, 5 k Rx/day, ~1 TB storage):

| Layer | Bottleneck | Fix |
|---|---|---|
| **Architecture** | `prescription_image_blobs` doubles DB size | Move to object storage + lifecycle to cold; DB keeps only checksum + URL |
| **DB** | `admin_stats()` scans 30 d of orders + `jsonb_array_elements(items)` | Materialised view refreshed every 5 min; index on `orders(created_at)` |
| **DB** | `create_scheduled_backup` `jsonb_agg` whole tables | Switch to streaming row-by-row dump |
| **DB** | No partitioning on `orders`, `prescriptions`, `error_logs` | Monthly range partitioning by `created_at` |
| **Storage** | Single-region bucket | Cross-region replication + signed-URL CDN |
| **Edge** | All routes SSR through one Worker region | Already on Cloudflare — fine; add HTML cache for catalog routes |
| **Search** | Product search = client-side filter on `products.json` | Postgres `tsvector` + GIN index; later Algolia or Typesense |
| **AI** | AI Gateway per-call billing | Per-IP + per-customer daily token cap; cached embeddings for repeat queries |
| **Ops** | One pharmacist queue | Multi-pharmacist queue with claim/release semantics |
| **People** | Owner does everything | The 10 AI agents above + 3 hires (lead pharmacist, ops manager, growth) |

Scaling plan (timeline):
- **Q1**: partitioning, materialised views, stock_qty column, signed-URL CDN.
- **Q2**: multi-pharmacist queue, Inventory + Sales agents live.
- **Q3**: cross-region replication, insurance B2B integration, loyalty program.
- **Q4**: search infra upgrade, mobile app (TWA already scaffolded — `twa-manifest.json`), expansion to 2nd city.

---

## PHASE 8 — FAILURE ANALYSIS (10 most likely ways this dies in 24 months)

| # | Failure mode | Probability | Impact | Prevention |
|---|---|---|---|---|
| 1 | **Regulatory shutdown** (Yemen MoH cracks down on online Rx) | 30% | Existential | Get licensed early; pharmacist-of-record on file; audit trail in `rx_activity_log` |
| 2 | **Trust incident** (wrong medication shipped, harm reported) | 25% | Existential | Two-pharmacist verification on every dispense; insurance liability |
| 3 | **Cash crunch** from negative unit economics | 35% | Severe | Min-order threshold; delivery-fee tiers; track per-order margin from day 1 |
| 4 | **WhatsApp ban** (Meta blocks the business number) | 15% | Severe | Two verified numbers; SMS + Telegram fallback in code |
| 5 | **Founder burnout / single point of failure** | 50% | Severe | AI agents + 3 ops hires within 6 mo |
| 6 | **Payment / banking shutdown** in Yemen | 20% | Severe | COD-first; multiple wallet partners (Jaib, Floosak, Cash) |
| 7 | **YemenNet outage > 24 h** during peak | 40% (annual) | Medium | Already mitigated by offline queues; add SMS-based order intake |
| 8 | **Stockout on hero SKU** → customer defects to competitor | 60% | Medium | Inventory Agent + safety stock |
| 9 | **Competitor with $$$** undercuts on price | 30% | Medium | Compete on speed + trust, not price; loyalty lock-in |
| 10 | **Data breach / customer PII leak** | 15% | Severe | RLS already enforced; rotate keys quarterly; pen-test before each major release |

---

## PHASE 9 — EXECUTIVE ACTION LIST

### TOP 10 — THIS WEEK
| Rank | Action | Priority |
|---|---|---|
| 1 | Add `stock_qty`, `reorder_point`, `expiry_date` columns to `public.products`; decrement on `place_order` | **CRITICAL** |
| 2 | Ship staff-notification DB trigger on `orders` and `prescriptions` INSERT (WhatsApp + sound) | **CRITICAL** |
| 3 | Add `discount_codes` table + server-side validation in `place_order` | **CRITICAL** |
| 4 | Storage-upload rate limit on `prescriptions` bucket (closes red-team H-1) | **CRITICAL** |
| 5 | `WITH CHECK` on `prescriptions.image_urls` origin (closes H-2) | **HIGH** |
| 6 | Cart-page free-delivery progress bar + min-order copy | **HIGH** |
| 7 | First 8 product bundles in DB + UI | **HIGH** |
| 8 | Customer order-history page (by phone) | **HIGH** |
| 9 | "Notify when in stock" widget on product page | **MEDIUM** |
| 10 | Owner daily-digest WhatsApp at 08:00 (CEO Agent v0: handwritten SQL → message) | **MEDIUM** |

### TOP 10 — THIS MONTH
| Rank | Action | Priority |
|---|---|---|
| 1 | Loyalty program (Muslly Points) live | **CRITICAL** |
| 2 | Abandoned-cart WhatsApp recovery flow | **CRITICAL** |
| 3 | Rx-to-Quote AI v1 (drug name extraction + SKU suggestion) | **CRITICAL** |
| 4 | Multi-pharmacist queue with claim/release | **HIGH** |
| 5 | Driver-dispatch view + status transitions | **HIGH** |
| 6 | Materialised view for `admin_stats` | **HIGH** |
| 7 | Inventory Agent v1 (low-stock email + PO draft) | **HIGH** |
| 8 | Reorder-reminder cron for chronic SKUs | **HIGH** |
| 9 | First paid-ad landing pages (3 categories) | **MEDIUM** |
| 10 | NPS + review collection post-delivery | **MEDIUM** |

### TOP 10 — THIS QUARTER
| Rank | Action | Priority |
|---|---|---|
| 1 | Pharmacist license + insurance secured, displayed on site | **CRITICAL** |
| 2 | Insurance B2B contracts with top 3 insurers | **CRITICAL** |
| 3 | Two-pharmacist verification on every dispensed Rx | **CRITICAL** |
| 4 | Partitioned `orders` / `prescriptions` / `error_logs` | **HIGH** |
| 5 | Cross-region storage replication | **HIGH** |
| 6 | All 10 AI agents in production with `agent_runs` log | **HIGH** |
| 7 | TWA Android app published (assets ready: `ANDROID.md`, `twa-manifest.json`) | **HIGH** |
| 8 | Postgres full-text search on products | **HIGH** |
| 9 | Hire: lead pharmacist, ops manager, growth lead | **HIGH** |
| 10 | Expansion to 2nd city / governorate | **MEDIUM** |

---

## FINAL ANSWER — "If this were my money, what would I do next?"

### Immediate (next 72 hours)
1. **Lock in the licence**: hire a registered pharmacist as Pharmacist-of-Record. Without this, item #1 of Phase 8 kills the company. Money: ~$1 500/mo salary, $0 in tech.
2. **Stop selling inventory we don't have**: ship `stock_qty` column + decrement in `place_order` *today*. The phantom-stock bug compounds every order.
3. **Turn on staff notifications**: a DB trigger that pings the pharmacist group on every new order/Rx. We are currently relying on F5 — unacceptable.
4. **Close the three red-team blockers' siblings**: H-1, H-2 (anonymous bucket + table writes). Cheap, an hour each.

### 30-Day Plan (target: prove the loop works)
- Ship bundles, discount codes, free-delivery threshold → measure AOV lift.
- Loyalty program live → measure repeat-rate lift in cohort.
- Rx-to-Quote AI v1 → measure pharmacist time-per-Rx.
- WhatsApp automation flows 1–4 live.
- CEO Agent + Inventory Agent live (even if rough).
- KPI: **+25% orders, +20% AOV, +10 pts repeat rate vs. baseline week.**

### 90-Day Plan (target: defensible position)
- Insurance B2B signed with at least one insurer.
- Multi-pharmacist queue + driver dispatch + SLA timers.
- Partitioned tables + materialised views ready for 10× load.
- Android TWA published; muslly.com brand campaign.
- Full 10-agent suite operating; owner spends <2 h/day in ops.
- KPI: **2× orders, 35% repeat rate, NPS ≥ 50, gross margin ≥ 28%.**

### 12-Month Plan (target: #1 in Yemen)
- 5× orders vs. takeover baseline.
- 50 000 customers in the DB; 18 000 monthly actives.
- Insurance B2B = 15% of revenue; chronic-Rx subscriptions = 25% of revenue.
- Expansion to 2 additional cities.
- Hired team of 8 (lead pharmacist, 3 pharmacists, ops manager, 2 drivers' coordinator, growth lead, support lead).
- Series-A optional, not required — the unit economics make the business self-funding.
- KPI: **#1 by order volume in Yemen digital pharmacy, $10 M ARR, 32% gross margin, LTV/CAC ≥ 4.**

---

**Bottom line:** the tech is now production-safe (war room closed). The next dollar of value is **not** in code; it's in **licensing, inventory discipline, retention, and ops automation**. Build the AI agents and the loyalty loop before any new feature.
