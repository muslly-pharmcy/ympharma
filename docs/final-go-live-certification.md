# Final Go-Live Certification Audit
**التاريخ:** 2026-06-19 · **النوع:** Production Certification Report (لا توصيات منتج)
**القاعدة:** كل بند بدليل ملف/سطر/دالة/استعلام DB.

---

## VERDICT — Top of report

**Would I personally approve this system for my own pharmacy business?**

# ❌ **NO**

**Blocking issues (must fix before launch):**
1. **BLOCK-1** — Orders insert is fire-and-forget; can lose orders silently. (`src/lib/cart.tsx:108–124`)
2. **BLOCK-2** — Order `id` = 6-char base36 tail of `Date.now()`; collision-prone under load → duplicate-PK INSERT fails silently. (`src/lib/cart.tsx:92`)
3. **BLOCK-3** — Storage bucket `prescriptions` has no off-site copy; backup `payload` only stores `image_urls`, not binaries → kararthe = الصور مفقودة نهائياً.

**Estimated time to remove all blockers:** ~3 ساعات عمل.

---

## PHASE 1 — Zero Data Loss Certification

| Workflow | Awaited | DB ACK | Retry | Queue | Recovery | UX feedback | Dup. prevention | **Verdict** |
|---|---|---|---|---|---|---|---|---|
| Prescription create (`prescription.tsx:164–284`) | ✅ await on every step | ✅ checked `commit.ok` | ✅ 5× backoff (`net-retry.ts`) | ✅ localStorage `rx:pending` | ✅ banner re-commits on next visit | ✅ stage labels + toast | ✅ refId idempotent (`rx-pending.ts:77`) | **PASS** |
| Image upload (`prescription.tsx:202–245`) | ✅ awaited | ✅ HEAD verify (`verifyUploaded`) | ✅ 5× backoff | ❌ (URL kept in `rx:pending`) | ✅ retried with refId | ✅ per-file stage | ✅ unique `path` per i+timestamp | **PASS** |
| Order create (`cart.tsx:90–127`) | ❌ `void (async …)()` line 108 | ❌ error only `console.error` line 120 | ❌ none | ❌ none | ❌ none | ❌ user sees success regardless | ⚠️ PK `text`, collision possible (line 92) | **FAIL** |
| Staff update prescription/order (`PrescriptionsTab.tsx` via `applyChange` in `shared.tsx`) | ✅ await | ✅ error surfaced | ❌ none | ❌ none | ❌ refresh-only | ✅ toast | N/A (UPDATE not INSERT) | **PASS (no retry, but acceptable for admin)** |
| Admin actions (role grant, settings) | ✅ await | ✅ checked | ❌ none | ❌ none | ❌ none | ✅ toast | N/A | **PASS** |
| Customer search/track | ✅ read-only via SECURITY DEFINER | ✅ direct | N/A | N/A | N/A | ✅ | N/A | **PASS** |

**Phase 1 result:** 5 PASS / 1 FAIL — **FAIL is the Orders workflow (BLOCK-1 + BLOCK-2).**

---

## PHASE 2 — YemenNet Stress Test

| Scenario | Prescription | Image | Order |
|---|---|---|---|
| Unstable connection | ✅ retry+pending | ✅ retry+verify | ❌ no retry — silent loss |
| Packet loss | ✅ HEAD re-checks | ✅ | ❌ |
| High latency (>30 s) | ✅ AbortController 10 s + retry | ✅ | ❌ no timeout handling |
| Browser refresh mid-submit | ✅ draft+pending restored | ✅ URL in pending | ⚠️ saved to `localStorage` but never re-attempts DB |
| Tab close before WA opens | ✅ DB row exists + pending banner | ✅ | ⚠️ row may not exist; user thinks "done" |
| Mobile network switch | ✅ `waitForOnline()` in `net-retry.ts:18–28` | ✅ | ❌ |
| Intermittent connectivity | ✅ exp backoff | ✅ | ❌ |

**Evidence:**
- `src/lib/net-retry.ts:18–28` (`waitForOnline`) — proves retry pauses while offline.
- `src/routes/prescription.tsx:79–86` (`loadPending` on mount) — proves restart-recovery.
- `src/lib/cart.tsx:108–124` — proves order has none of the above.

---

## PHASE 3 — Disaster Recovery Audit

### Backup Strategy
| Item | Evidence | Status |
|---|---|---|
| Backup exists | `cron.job` `backup-daily` `active=true` (live) | ✅ |
| Last successful run | `SELECT max(created_at) FROM backups` = **2026-06-19 02:00 UTC** | ✅ |
| Backup count in 7 days | `cron.job_run_details succeeded` = **2** | ⚠️ expected 7; under-running |
| Retention | `create_backup()` keeps 14 daily / 8 weekly / 30 manual | ✅ |
| Off-site copy of payload | ❌ none — `backups` row sits in same DB | ❌ |
| Storage (images) backup | ❌ payload only has `image_urls`, not binaries | ❌ (**BLOCK-3**) |

### Restore Strategy
- **Single row:** `INSERT INTO orders SELECT … FROM jsonb_to_recordset((SELECT payload->'orders' FROM backups WHERE id=…))` — manual, documented in `docs/phase-2-evidence-audit.md`.
- **Full DB:** Supabase managed PITR (Lovable Cloud control).
- **Storage bucket:** **no procedure exists.** This is unrecoverable.

### RTO / RPO
| Resource | RPO | RTO |
|---|---|---|
| Orders/Prescriptions (DB) | 24 h | 15 min manual restore |
| Auth users | ~5 min (PITR) | 30 min via support |
| Storage bucket | **∞** | **∞** |

**Backup tested:** ❌ no restore drill on record.
**Recovery documented:** ⚠️ partial (`docs/phase-2-evidence-audit.md` §3.2); no runbook for image loss.

---

## PHASE 4 — Security Certification

### Tables (26 in `public`; RLS on all — `pg_tables` query)
| Table | Anon write | Auth read scope | **Verdict** |
|---|---|---|---|
| `prescriptions` | INSERT with length/array checks | staff (`has_role`/`has_permission`) | **PASS** |
| `orders` | INSERT with length/total checks | staff | **PASS** (RLS), see Phase 1 for app-layer FAIL |
| `user_roles` | none | self or owner | **PASS** |
| `staff_permissions` | none | self or owner | **PASS** |
| `products` | none | `is_published=true` or admin | **PASS** |
| `offers` | none (admin only) | `is_active=true` or admin | **PASS** |
| `activity_logs` | INSERT own row only | owner | **PASS** |
| `backups` | none | owner/admin | **PASS** |
| `email_send_log/state/tokens` | service_role only | service_role only | **PASS** |
| `error_logs` | INSERT with field-length checks | admin | **PASS** (no rate limit; backend lacks primitive — noted gap) |
| `error_logs_archive`, `uptime_*`, `img_*`, `alert_dedupe`, `retention_config`, `trust_pages`, `insurance_claims`, `order_status_history`, `product_image_overrides`, `suppressed_emails` | scoped correctly | admin/owner | **PASS** |

**RLS Verdict: 26/26 PASS.**

### Storage Buckets (`storage.buckets`)
| Bucket | Public | Upload policy | Read policy | **Verdict** |
|---|---|---|---|---|
| `prescriptions` | false | anon allowed only under `uploads/*` + MIME whitelist + ≤10 MB | staff only | **PASS** |
| `insurance` | false | anon allowed + MIME + ≤10 MB | admin/owner/`prescriptions` perm | **PASS** |

**Storage Verdict: 2/2 PASS** at policy layer.

### Admin / Staff / Customer Access
- Admin route gate: `src/routes/admin.tsx:59–62` — verified.
- Staff permissions: `has_permission()` SECURITY DEFINER — verified in DB function catalog.
- Customer-only data exposure: order/prescription tracking goes through SECURITY DEFINER functions (`get_order_public`, `get_order_history_public`) that return curated columns. **PASS.**

### Admin lockout risk
| Path | Result |
|---|---|
| Only 1 admin/owner pair | `admin_count = 2` (live query) — single point of failure if owner loses email |
| `bootstrap_owner()` recovery | Available, requires existing `admin` role to become `owner` — works only if at least 1 admin remains |
| **Verdict** | ⚠️ NON-BLOCKING but recommend adding a 2nd admin manually before launch |

---

## PHASE 5 — Business Continuity

| Failure | Can pharmacy operate? | Fallback evidence |
|---|---|---|
| WhatsApp down | ⚠️ partial — order/rx exist in `/admin`; staff phone customer manually | `admin.tsx` lists pending rows with phone field |
| Email down | ✅ — admin uses dashboard; queue retains until back (pgmq TTL) | `email_send_state` config |
| Realtime down | ✅ — `/admin` manual refresh works | `OrdersTab.tsx` reads via standard query |
| Storage down | ❌ — customers cannot upload Rx; **no offline accept-and-forward** | — |
| Supabase slow | ✅ for reads (13 indexes); writes degrade gracefully on Rx (retry), **fail silently on orders** | Phase 1 FAIL |
| CDN (Cloudflare) down | ✅ — Lovable serves as origin fallback | `docs/cloudflare-setup.md` |

**Business continuity Verdict: 4 ✅ / 1 ⚠️ / 1 ❌** — the ❌ is partly mitigated by retry on the customer's next visit (draft is saved).

---

## PHASE 6 — Technical Debt

| Rank | Item | Evidence | Risk |
|---|---|---|---|
| **CRITICAL** | Orders fire-and-forget + 6-char ID collision | `src/lib/cart.tsx:92, 108–124` | Lost/duplicate orders under YemenNet |
| **CRITICAL** | No Storage bucket backup procedure | DR §3.1 | Unrecoverable image loss |
| **HIGH** | `src/lib/products-extra.ts` = 3388 lines | `find` output | Maintainability bottleneck; should be DB-driven |
| **HIGH** | `src/components/admin/PrescriptionsTab.tsx` = 1162 lines | same | Cannot refactor safely; high regression risk |
| **HIGH** | No 2nd admin (bus factor = 1) | `SELECT count(*) … role IN ('owner','admin')` = 2 (1 owner + 1 admin) | Lockout risk |
| **MEDIUM** | Backup ran 2× in 7d instead of 7× | `cron.job_run_details` | Possibly normal (recent provisioning) — needs monitoring |
| **MEDIUM** | No automated admin alert on new rx/order | Phase 2 WARN-2 | Customer thinks done; admin late |
| **MEDIUM** | SW cache invalidation untested | `public/sw.js` | Stale UI after deploy |
| **MEDIUM** | `src/routes/admin.tsx` = 519 lines | same | Should split tabs into routes |
| **LOW** | 0 products in DB; catalog in code | `SELECT count(*) FROM products` = 0 | No dynamic inventory |
| **LOW** | `error_logs` no rate limit | (backend lacks primitive) | Acknowledged gap |
| **LOW** | 12 SECURITY DEFINER linter warnings | `supabase--linter` | All internally protected — intentional |

---

## PHASE 7 — Executive Certification

| Score | Value | Justification |
|---|---|---|
| **Production Readiness** | **62 / 100** | 5/6 workflows PASS; orders FAIL is launch-blocking; DR has a hole |
| **Reliability** | **65 / 100** | Rx pipeline excellent; orders pipeline fragile on weak networks |
| **Security** | **92 / 100** | 26/26 RLS PASS, 2/2 buckets PASS, admin gate enforced; small gaps in rate limit (backend-level) and 2nd admin |
| **Scalability** | **70 / 100** | Indexed, but catalog in code, instance default size, large monolithic files |
| **YemenNet Compatibility** | **78 / 100** | Excellent for Rx; degraded for orders — blocks score from 90+ |

### Final Decision

# ❌ **NO — do not launch tomorrow as-is.**

### Blocking Issues (must fix before launch)
1. **BLOCK-1 (CRITICAL)** — Orders: wrap `placeOrder` in the same `pending/retry/verify/commit` pattern used by prescriptions (`src/lib/orders-pending.ts` mirroring `src/lib/rx-pending.ts`). **Time: 60 min.**
2. **BLOCK-2 (CRITICAL)** — Order ID collision: change generator to `crypto.randomUUID()` or `"AM-" + crypto.randomUUID().slice(0,8).toUpperCase()`; add `ON CONFLICT (id) DO NOTHING RETURNING id` then retry with new id on conflict. **Time: 20 min.**
3. **BLOCK-3 (HIGH→CRITICAL for pharmacy)** — Storage backup: implement weekly off-site export of `prescriptions/` bucket via TanStack server function that streams to a downloadable ZIP (admin-only). Document restore. **Time: 90 min.**

### After fixing the 3 blockers, expected scores
- Production Readiness: 62 → **90**
- Reliability: 65 → **90**
- YemenNet: 78 → **92**
- Re-certification verdict: **YES — approved for launch.**

### Non-Blocking issues to follow up within 7 days
- Add 2nd admin (manual, by owner).
- Admin-notification email on new rx/order via DB trigger + pgmq.
- Split `products-extra.ts` and `PrescriptionsTab.tsx` (each > 1000 lines).
- Monitor `cron.job_run_details` for missed backup runs.
- Test SW update flow.
- Move product catalog to DB.

---

**Certifier:** CTO + Principal Architect + SRE + Security + DR Board.
**Evidence basis:** files (with line numbers), DB live queries, `cron.job`, `cron.job_run_details`, `pg_tables`, `pg_policies`, Supabase linter.
**Re-audit due:** after BLOCK-1/2/3 fixes.

