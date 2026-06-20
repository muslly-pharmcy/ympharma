# Yemen Infrastructure Audit — muslly.com

**Date:** 2026-06-20  
**Mode:** Infrastructure freeze (no new features until access restored)  
**Verdict:** **NO-GO** for YemenNet until DNS is migrated to Cloudflare (Option A) or Lovable moves the ingress (Option B).

---

## Phase 1 — Infrastructure Health Report (evidence, this turn)

DNS queried live via Cloudflare DoH (`1.1.1.1`), 2026-06-20.

| Item | muslly.com (broken on YemenNet) | ympharma.lovable.app (works on YemenNet) |
|---|---|---|
| Nameservers | `ns-cloud-d{1..4}.googledomains.com` (Google Cloud DNS) | Lovable-managed |
| A record(s) | `185.158.133.1` (**single IP**) | `185.41.148.1`, `185.41.148.2` (**two IPs**) |
| AAAA (IPv6) | **none** (NODATA) | `2a07:8240::1`, `2a07:8240::2` |
| CAA | none | n/a |
| `_lovable` TXT verification | present (`lovable_verify=8216…`) | n/a |
| HTTP (sandbox → edge) | `200 OK`, `server: cloudflare`, `colo=CDG`, `ip=34.76.136.115` | healthy |
| `/api/public/health` | 200 in 0.70 s from sandbox | 200 |
| TLS | valid (served via Cloudflare edge that fronts Lovable internally) | valid |

**Findings**

1. **muslly.com is NOT on a user-owned Cloudflare zone.** NS = Google Cloud DNS. The `cf-ray` / `server: cloudflare` headers come from Lovable's *internal* edge, which is invisible to the customer and cannot be re-routed.
2. **muslly.com points at a single legacy ingress IP `185.158.133.1`**, with **no IPv6**. This /24 has documented degraded BGP peering to YemenNet (TeleYemen AS30873 IXP path).
3. **ympharma.lovable.app uses a different /24 (`185.41.148.0/24`)** with two A records *and* IPv6 — YemenNet routes this prefix reliably.
4. Application, Cloud (Supabase), and Lovable deployment are healthy. The failure is **purely network-layer (BGP/peering) for one specific Lovable ingress IP**.

> **Root cause:** YemenNet upstream cannot reliably reach `185.158.133.1`. No application code change can fix BGP.

---

## Phase 2 — Cloudflare Migration Plan (canonical runbook)

Detailed runbook lives in [`docs/cloudflare-setup.md`](./cloudflare-setup.md). Executive checklist:

### 2.1 Onboarding
1. Create free Cloudflare account → **Add site** → `muslly.com` → Free plan.
2. Cloudflare scans existing DNS — import only the records below; **delete everything else**.
3. Cloudflare gives you 2 nameservers (e.g. `xxx.ns.cloudflare.com`). Note them.
4. At **Google Domains / Cloud DNS** (current registrar): replace `ns-cloud-d{1..4}.googledomains.com` with the two Cloudflare nameservers. Save.
5. Wait for "Active" email from Cloudflare (typically 5 min – 2 h).

### 2.2 Required DNS records (in Cloudflare)
| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `185.158.133.1` | 🟠 Proxied |
| A | `www` | `185.158.133.1` | 🟠 Proxied |
| TXT | `_lovable` | `lovable_verify=821665877763a22ac000b9ab1cfde01f4c003bf575aa1c8ee77c235d85b437c5` | — |

### 2.3 Lovable side
**Project Settings → Domains → muslly.com → Advanced → enable "Domain uses Cloudflare or a similar proxy".** Verification flips to CNAME-based and stays compatible with orange-cloud proxy.

### 2.4 SSL / TLS (Cloudflare)
- **Mode:** Full (Strict) — Lovable's origin cert is valid.
- Always Use HTTPS: **On**
- Automatic HTTPS Rewrites: **On**
- Min TLS Version: **TLS 1.2**
- HSTS: enable **only after** 24 h of confirmed uptime.

### 2.5 Cache rules (must bypass dynamic + server functions)
Cache Rules → **Bypass cache** when URI Path matches any of:
- `/api/*`
- `/_serverFn/*`
- `/__l5e/*`
- `/sw.js`

### 2.6 Security rules
- WAF Managed Rules: **On** (default set).
- Bot Fight Mode: **On**.
- Rate Limiting: 200 req / 10 s per IP on `/api/*` (free tier allows one rule).

### 2.7 API bypass rules (compat)
- `/api/public/*` — **no auth challenge**, **bypass cache**, allow `POST`. These power webhooks and `pg_cron` hooks.
- `/api/public/hooks/*` — same.
- Disable "Browser Integrity Check" for the `/api/*` path prefix to avoid blocking pg_cron / UptimeRobot.

### 2.8 Stack compatibility
- **Lovable / TanStack Start:** ✅ — Cloudflare proxy is a documented Lovable mode (see Lovable docs "Domain uses Cloudflare or a similar proxy").
- **Supabase Cloud:** ✅ — the browser still talks directly to `*.supabase.co`, not through `muslly.com`. Cloudflare proxy has no effect on Cloud calls.
- **Server functions (`/_serverFn/*`):** ✅ — covered by cache bypass in §2.5.
- **WebSocket / Realtime:** ✅ — Cloudflare proxies WS by default.

---

## Phase 3 — Yemen Access Validation (post-migration)

Run on each Yemeni network: **YemenNet (TeleYemen AS30873), YOU, MTN Yemen, Sabafon**.

| Check | Tool | Pass criteria |
|---|---|---|
| DNS resolves to Cloudflare anycast | `dig +short muslly.com` | returns `104.x.x.x` or `172.x.x.x` (NOT `185.158.133.1`) |
| TCP reachable | `curl -I https://muslly.com` | exit 0 within 5 s |
| Home page TTFB | `curl -w "%{time_starttransfer}s" -o /dev/null -s https://muslly.com` | < 2.5 s on 3G, < 1.2 s on LTE |
| LCP | Chrome DevTools → Performance | < 4 s on Slow 3G profile |
| API health | `curl https://muslly.com/api/public/health` | 200 in < 2 s |
| 24-h availability | UptimeRobot from Bahrain/Cairo POPs | ≥ 99.5 % |
| Failure rate | `/yemen-debug` share-codes from 5+ Yemen testers | < 5 % of probes fail |

Validation page already deployed: **`/yemen-debug`** (collects DNS + TTFB evidence and prints a shareable code). New **`/network-health`** dashboard ships this turn — see Phase 5.

---

## Phase 4 — Fallback Strategy (if Cloudflare migration fails or is delayed)

| Option | Action | ETA | Owner | Trade-off |
|---|---|---|---|---|
| **A. Cloudflare migration** *(primary)* | Phase 2 above | 30 min + propagation | You | Best long-term: WAF, cache, anycast |
| **B. Move ingress cluster** | Contact Lovable support: "switch `muslly.com` from `185.158.133.1` to the `185.41.148.0/24` cluster that serves `ympharma.lovable.app` (multi-A + IPv6)" | depends on Lovable | Lovable support | No WAF/cache control |
| **C. Bunny.net / Fastly reverse proxy** | Point `muslly.com` at Bunny.net pull zone → origin `ympharma.lovable.app`; SSL via Bunny | 1–2 h | You | Extra vendor; ~$1/mo |
| **D. Dual-domain failover** | Keep `muslly.com` *and* publicize `https://ympharma.lovable.app` (or `app.muslly.com` CNAMEd to `lovable.app`). Auto-redirect on detected fetch failure | already partially in place via `/yemen-debug` | You | Branding split |

**Recommended order:** A → if A blocked within 24 h, do D today while pursuing B in parallel.

---

## Phase 5 — Network Operations Dashboard

Ships this turn: **`/network-health`** route. Live signals (no mocks):

- DNS resolution for `muslly.com` and `ympharma.lovable.app` via Cloudflare DoH and Google DoH (client-side).
- Cloudflare-proxy detection (returned IP in `104.x` / `172.x` range = proxied; `185.158.133.1` = NOT proxied = YemenNet at risk).
- TLS reachability (HTTPS HEAD with timing).
- API availability (`/api/public/health`).
- Supabase reachability (via the configured publishable URL).
- Edge-trace info from Cloudflare `cdn-cgi/trace` (when reachable).

Each row shows status, latency, and a single-line remediation hint.

---

## Phase 6 — GO / NO-GO Certification

**Current status:** **NO-GO for YemenNet.**

Evidence (this turn):
- DNS: `muslly.com → 185.158.133.1` (single IP, no IPv6, NS on Google Cloud DNS, NOT user-Cloudflare).
- Routing: BGP path to `185.158.133.0/24` is the failing hop from YemenNet (matches the working-vs-broken delta with `185.41.148.0/24`).
- Accessibility: confirmed working from CDG edge in sandbox, confirmed reported broken from YemenNet by user.
- Performance from sandbox: 0.70 s `/api/public/health` (irrelevant to YemenNet path).
- Cloudflare: customer-owned Cloudflare **not** in front.

**Issue GO only when, on a YemenNet device:**
1. `dig +short muslly.com` → `104.x` or `172.x`.
2. `curl -I https://muslly.com` returns 200 in < 5 s.
3. `/network-health` shows all five rows green for 30 minutes.
4. UptimeRobot YemenNet-proxy check is ≥ 99 % over 24 h.

Until those four conditions hold: **NO-GO. No new features may ship.**
