# RED TEAM — Final Pre-Launch Destruction Test
**Date:** 2026-06-19 · **Target:** muslly.com (pharmacy) · **Method:** evidence-based, hostile auditor.

---

## CRITICAL (deployment blockers)

### C-1 — Price/total tampering on `orders` INSERT (anonymous)
- **Where:** RLS policy `orders → "anyone can create order"` (`cmd=INSERT`, `roles={anon,authenticated}`, `with_check=NULL`). Client code: `src/lib/cart.tsx:91-115` + `src/lib/orders-pending.ts:73-92` (`commitOrder`).
- **Attack:**
  ```
  curl -X POST $SUPABASE_URL/rest/v1/orders \
       -H "apikey: <anon>" -H "Authorization: Bearer <anon>" \
       -H "Content-Type: application/json" -H "Prefer: return=representation" \
       -d '{"id":"AM-EVIL00000001","customer_name":"x","customer_phone":"x",
            "customer_address":"x","total":1,"status":"pending",
            "items":[{"id":1,"qty":99,"name":"Whatever","price":1}]}'
  ```
  Inserts succeed: PostgREST is granted INSERT to `anon`, and there is **no `WITH CHECK` clause** validating `total`, `items[].price`, `status`, or that prices match `public.products`. The cart UI sends `total` and per-item `price` straight from the browser (`src/lib/cart.tsx:96-98`). A customer can place a 100 000 ر.ي order for 1 ر.ي.
- **Impact:** unbounded revenue loss on day one; trivially scriptable.
- **Fix:** server-side checkout via `createServerFn` that recomputes `total` from `products` table; revoke direct `INSERT … TO anon` on `orders` and replace with a `place_order` SECURITY DEFINER RPC that recomputes price + enforces `status='pending'`.

### C-2 — Anonymous mass-pollution of `prescription_image_blobs`
- **Where:** `src/lib/rx-backup.functions.ts` is a `createServerFn` with **no `requireSupabaseAuth`** middleware and **no rate-limit / nonce / signature**. It loads `supabaseAdmin` (service role) and writes up to 12 MB per call.
- **Attack:** call `backupRxImage({rxId:"AM-XXX", storagePath:"x", contentType:"image/png", base64:"<12MB>", sha256:"<64hex>"})` in a loop. Each call writes ~12 MB into the database as `bytea`. 1 000 requests = ~12 GB of DB storage; the UNIQUE constraint is on `(rx_id, sha256)` so attacker just randomises one byte to bypass dedupe.
- **Impact:** DB bloat → backup failure (`create_scheduled_backup` reads every row into a single `jsonb_agg`, will OOM), storage-cost blow-up, daily backups silently start failing.
- **Fix:** add `.middleware([requireSupabaseAuth])` OR verify the caller owns the `rx_id` (e.g. require a short-lived signed token issued at prescription create time); cap rows/IP/day; reject if `prescriptions.id` does not exist.

### C-3 — Order-ID forgery / overwrite of another customer's tracking page
- **Where:** `generateOrderId()` (`src/lib/orders-pending.ts:55-72`) returns `AM-` + 12 hex chars. The id is the **primary key** AND the only thing the public tracking page (`get_order_public(_id text)`) accepts.
- **Attack:** combined with C-1, an attacker can insert rows whose `id` collides with future organic ids (48 bits = ~16 M; in practice safe), **and more importantly** can pre-occupy ids like `AM-000000000001` and harvest them via `/track?id=…`. Also: tracking ids are guessable enough (48 bits) that automated enumeration of `get_order_public` over a workday is feasible (~16 M calls, no rate-limit on the RPC).
- **Impact:** customer PII leak (name, address, phone, items list) via `get_order_public`. Confirmed by reading `public.get_order_public` — returns `customer_name` and `items` JSON for any id.
- **Fix:** rate-limit `get_order_public` (per IP/hour); require `phone` last-4 as a second arg; or move tracking behind a one-time signed URL emailed in the WhatsApp template.

---

## HIGH

### H-1 — Anonymous flood of `prescriptions` storage bucket
- **Where:** storage policy `"anyone upload prescription images"` (`INSERT`, `roles={anon,authenticated}`) only constrains folder/MIME/size, not count. No `check_img_rate_limit`-style guard on `storage.objects`.
- **Attack:** anon script uploads 10 MB PNGs in a loop under `uploads/`. Each request is a valid PostgREST/storage call.
- **Impact:** storage cost explosion + slow listing in admin UI.
- **Fix:** add a per-IP rate-limit trigger on `storage.objects INSERT` similar to `check_img_rate_limit`; or front uploads with a signed-token server fn.

### H-2 — Anonymous insert into `prescriptions` table independent of storage
- **Where:** `prescriptions → "anyone create prescription"` INSERT, no `WITH CHECK`. An attacker can insert rows with arbitrary `image_urls`, including links to attacker-controlled domains — pharmacy staff opening them is XSS-via-trusted-UI risk.
- **Impact:** spam queue, possible click-through phishing of staff.
- **Fix:** `WITH CHECK` that requires `image_urls` to start with the project storage origin; rate-limit by IP.

### H-3 — `placeOrder` UI does not block the page-refresh window
- **Where:** `src/routes/cart.tsx:34-55`. `busy` disables the button, but a refresh (`F5`) or back-button between `await placeOrder` and `setTimeout(navigate, 600)` leaves the row in DB, cart cleared (good), but no UI confirmation. The user may **re-fill and re-submit** thinking it failed → duplicate order with new id.
- **Impact:** duplicate orders under flaky network.
- **Fix:** persist `lastPlacedOrderId` in `sessionStorage` immediately after `persistAndCommit` resolves and show a "Recovered: order X already sent" banner on next mount.

### H-4 — Service-worker cache may serve a stale `cart.tsx` after a price-fix deploy
- **Where:** `public/sw.js` (precaches) + no version-bust UX before user accepts update banner.
- **Impact:** customers continue submitting with old prices for hours after a deploy.
- **Fix:** ship `skipWaiting()` + `clients.claim()` on critical asset hash change for `/cart`, `/prescription`, `/products`.

---

## MEDIUM

- **M-1** `src/routes/prescription.tsx:289` `void (async () => …)` for `backupRxImage` — tab close mid-loop = some images never reach DB blob backup (storage still has them, but C-2 fix should also `await` this with a 5 s budget and silent fallback).
- **M-2** `drainPendingOrders()` (`src/lib/orders-pending.ts:120`) runs sequentially with no backoff between items; 50 queued orders on a recovered connection = 50 serial network round-trips, blocking the boot path.
- **M-3** `admin_stats()` scans `orders` + `jsonb_array_elements(items)` over 30 days with no index → at 10 000+ orders the admin home page will time out.
- **M-4** No DB trigger emails admin on new order/prescription — under WhatsApp Cloud outage staff have **no notification** that orders are arriving. Already flagged in earlier audits; still unbuilt.
- **M-5** `create_scheduled_backup` builds one giant `jsonb_agg` per table per day → will OOM the Postgres backend once `prescription_image_blobs` grows (compounds with C-2).

## LOW

- **L-1** `email_send_log`/`error_logs` retention is purely time-based; no size cap.
- **L-2** No CSRF / Origin check on `/api/public/*` webhooks beyond signature where present.
- **L-3** Anonymous users can call `enqueue_email` indirectly through DB functions if any future trigger fires on anon insert — defence in depth missing.
- **L-4** Bundle size: `src/components/admin/PrescriptionsTab.tsx` ships to **every** route via shared chunks (>1 000 lines) — slow first paint on 3G.

---

## Phase verdicts (summary)

| Phase | Verdict |
|---|---|
| 1 Order system | **FAIL** — C-1, C-3, H-3 |
| 2 Prescription system | **FAIL** — C-2, H-1, H-2 |
| 3 Supabase RLS/Storage | **FAIL** — C-1, C-2, H-1, H-2 (PASS on user_roles, prescription_image_blobs SELECT, admin role gating) |
| 4 Admin panel | **PASS** — admin route gate at `src/routes/admin.tsx:59-62` + `has_role`/`has_permission` on every staff policy |
| 5 Reliability | **PASS-with-gaps** — order queue + rx queue survive offline; WhatsApp outage = no staff alert (M-4) |
| 6 Performance | **WARN** — admin_stats / PrescriptionsTab won't scale past ~10 k rows |
| 7 YemenNet | **PASS** — `rx-pending`, `orders-pending`, `withRetry`, HEAD verify, draft persistence all in place |
| 8 Disaster recovery | **PASS-with-gaps** — daily DB backups active; storage bucket still single-region (no off-site copy yet) |
| 9 Forensics | unawaited backup loop (M-1), fire-and-forget WhatsApp (`insurance.functions.ts:95`), fire-and-forget incident alerts |

---

## FINAL VERDICT

> **Would I deploy this with my own money tomorrow?**
>
> **NO.**

**Deployment blockers (must fix before launch):**
1. **C-1** Server-side price recomputation on orders INSERT.
2. **C-2** Authenticate/rate-limit `backupRxImage` server function.
3. **C-3** Gate `get_order_public` with phone-last-4 or signed token + rate-limit.

After those three are fixed, H-1/H-2/H-3 should be closed within the first 48 hours of launch under close monitoring. Everything else can ship as backlog.
