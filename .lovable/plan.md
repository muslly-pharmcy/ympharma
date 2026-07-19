
# P1 #3 — Public POST Endpoint Security Analysis (READ-ONLY)

Scope: 5 endpoints under `src/routes/api/public/**`. No modifications.

## Shared baseline
- All live under `/api/public/*` → **published-site auth bypass is intentional**; each handler is responsible for its own guardrails.
- **No app-level rate limiting exists** (`no-backend-rate-limiting` policy — no primitive available). No IP throttling, no per-session quota, no CAPTCHA anywhere.
- All 5 use **Zod validation** with bounded fields.
- Writes use `supabaseAdmin` (service role) → RLS bypassed; validation + auth are the only gate.

---

## 1. `analytics/ingest.ts`

| Aspect | State |
|---|---|
| Auth | None (anonymous by design — visitor analytics) |
| Rate limit | None |
| Input validation | Zod: ≤50 events, name ≤64, path ≤512, props scalar-only |
| Payload cap | **20 KB hard cap** (checked pre-parse) |
| DB write | None currently (only `console.log`) |
| Abuse scenarios | Log-flooding / cost inflation via edge invocation spam; noisy console |
| **Risk** | **LOW** (no DB write, size-capped) |
| Minimal fix | Defer until endpoint starts writing to DB; then add per-IP token bucket or drop to `204` faster. |

---

## 2. `engagement/track.ts`

| Aspect | State |
|---|---|
| Auth | None (open pixel-style tracker) |
| Rate limit | None |
| Input validation | Zod: `deliveryId` uuid, `event` enum |
| Payload cap | None explicit (Zod rejects extras, but no size guard) |
| DB write | `campaign_deliveries.update ... .is(field, null)` — first-write-wins, idempotent |
| Abuse scenarios | Attacker who guesses/enumerates delivery UUIDs can falsify open/click metrics; unlimited request volume |
| **Risk** | **MEDIUM** — UUIDs are unguessable in practice but metric-poisoning is possible with leaked IDs; no size guard |
| Minimal fix | Add ~2 KB `request.text()` cap; consider signing `deliveryId` in outbound links (HMAC token) so only recipients can hit `track`. |

---

## 3. `contact.ts`

| Aspect | State |
|---|---|
| Auth | None (public form) |
| Rate limit | None |
| Input validation | Zod: name 2–100, email ≤255, message 10–1000 |
| Payload cap | None explicit (relies on Zod field caps → effectively ~1.5 KB) |
| DB write | `contact_messages.insert` with hashed IP + UA |
| Abuse scenarios | Spam floods → inbox pollution + storage growth; no CAPTCHA; email field is not validated to be reachable |
| **Risk** | **MEDIUM-HIGH** — cheapest DoS vector: unlimited inserts into ops-visible table |
| Minimal fix | Add per-IP-hash cooldown via DB check (e.g. reject if same `ip_hash` inserted in last 60 s); OR add hCaptcha/Turnstile; OR read-only honeypot field. |

---

## 4. `doctor-join.ts`

| Aspect | State |
|---|---|
| Auth | None |
| Rate limit | None |
| Input validation | Zod: strict field bounds; `photo_data_url` capped at **2.5 MB** as base64 string |
| Payload cap | None on outer body (Zod field cap ≈ 2.5 MB effective) |
| DB write | `contact_messages.insert` (folded structured payload into `message`) |
| Abuse scenarios | Same as `contact` plus **2.5 MB payload × N** — bandwidth + DB row bloat (though `message` is truncated to 1000 chars, the request is fully parsed first); fake doctor submissions |
| **Risk** | **HIGH** — largest attack surface: big payload + no rate limit + writes to ops table |
| Minimal fix | Add outer `request.text()` cap (~3 MB) with early 413; per-IP cooldown; reject if `has_photo=true` and photo missing MIME `image/*` prefix; verify via manual review queue before publishing. |

---

## 5. `hooks/social-callback.ts`

| Aspect | State |
|---|---|
| Auth | **HMAC-SHA256** over raw body via `verifyN8nSignature` (constant-time expected) |
| Rate limit | None |
| Input validation | Zod discriminated union; strict per-event schema |
| Payload cap | None explicit |
| DB write | `social_posts` update + `social_post_attempts` insert (**including rejected calls with `hmacValid=false`**) |
| Abuse scenarios | **Log-table flooding**: unauthenticated attacker can spam requests with any `post_id` in JSON; each rejection still inserts a row into `social_post_attempts` (bloat + cost). Also: HMAC helper trust — must be timing-safe + length-guarded. |
| **Risk** | **MEDIUM** — auth is correct for happy path, but rejection logging is unauthenticated write amplification |
| Minimal fix | (a) Only log rejected callbacks when `post_id` exists AND is valid uuid AND resolves to a real post; (b) add raw-body size cap (~64 KB); (c) confirm `verifyN8nSignature` uses `timingSafeEqual` with length guard (tracked separately in P1 audit). |

---

## Summary matrix

| # | Endpoint | Auth | Rate limit | Size cap | DB write | Risk |
|---|---|---|---|---|---|---|
| 1 | analytics/ingest | none | none | 20 KB ✅ | no | **LOW** |
| 2 | engagement/track | none | none | none | yes (idempotent) | **MEDIUM** |
| 3 | contact | none | none | none | yes | **MEDIUM-HIGH** |
| 4 | doctor-join | none | none | none (2.5 MB field) | yes | **HIGH** |
| 5 | hooks/social-callback | HMAC ✅ | none | none | yes (even on reject) | **MEDIUM** |

## Cross-cutting gaps
- No shared abuse-protection primitive. Per `no-backend-rate-limiting` policy, real rate limiting requires user confirmation before ad-hoc implementation.
- No outer `request.text()`/`request.json()` size guard on 4 of 5 endpoints (only `analytics/ingest` has one).
- Rejected-request DB writes on `social-callback` are an amplification vector.

## Recommended execution order (when approved)
1. **doctor-join** — add 3 MB body cap + IP-hash cooldown (highest-impact, smallest change).
2. **contact** — add IP-hash cooldown (60 s) reusing existing `ip_hash` column.
3. **social-callback** — validate `post_id` shape before rejected-attempt insert; add 64 KB raw cap.
4. **engagement/track** — 2 KB body cap; consider HMAC-signed delivery tokens (larger design change — defer).
5. **analytics/ingest** — no action until it starts persisting.

Await your GO on which items to implement (any subset). Nothing has been modified.
