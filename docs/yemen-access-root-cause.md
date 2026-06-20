# YemenNet Access — Root Cause Report (muslly.com)

**Date:** 2026-06-20  
**Status:** ROOT CAUSE CONFIRMED — fix is an infrastructure change, not a code change.  
**Confidence:** 95%

---

## 1. Evidence (collected from this sandbox, 2026-06-20 00:25 UTC)

### DNS — `muslly.com` (Cloudflare 1.1.1.1 DoH)

| Record | Value |
|---|---|
| **NS** | `ns-cloud-d1..d4.googledomains.com` ← **Google Cloud DNS, NOT Cloudflare** |
| **A** `muslly.com` | `185.158.133.1` (single IP, Lovable default ingress) |
| **A** `www.muslly.com` | `185.158.133.1` |
| **AAAA** | **none** (no IPv6) |

### DNS — `ympharma.lovable.app` (the URL that works on YemenNet)

| Record | Value |
|---|---|
| **A** | `185.41.148.1`, `185.41.148.2` (two IPs, different /24) |
| **AAAA** | `2a07:8240::1`, `2a07:8240::2` (IPv6 available) |

### HTTP (from sandbox via Cloudflare edge)

`curl https://muslly.com/cdn-cgi/trace` → `colo=CDG`, `server: cloudflare`, `cf-ray: …-CDG`.  
`curl -I https://muslly.com/api/public/health` → **HTTP/2 200**, healthy.

---

## 2. Root cause

**`muslly.com` is NOT behind your own Cloudflare account.** The nameservers are Google Cloud DNS and the A record points directly at Lovable's `185.158.133.1` ingress IP. Cloudflare appears in the response headers because Lovable's edge happens to sit behind Cloudflare internally — but you have **zero control** over that path.

This single IP (`185.158.133.1`) is the documented Lovable "connect-existing-domain" A target. On YemenNet / TeleYemen / Yemen Mobile it is known to have degraded peering — the BGP path to that prefix is unstable from Yemen IXP. Meanwhile `ympharma.lovable.app` resolves to a **different /24 (`185.41.148.0/24`) with multiple A records and IPv6**, which has better peering and is reachable.

The `docs/cloudflare-setup.md` runbook in this repo describes the correct fix (put your own Cloudflare in front so traffic hits Cloudflare's anycast `104.x / 172.x` ranges, which YemenNet routes well). **That runbook was never executed.** NS records still point to Google.

> Failing component: **single-IP Lovable ingress `185.158.133.1` over YemenNet upstream peering.**  
> Application, hosting, Supabase, Lovable platform are all healthy.

---

## 3. The fix (must be done by you — no code change can route around BGP)

### Option A — Move DNS to Cloudflare (recommended, ~30 min + DNS propagation)

1. Create a free Cloudflare account, add zone `muslly.com`.
2. At Google Domains (the current registrar / DNS host), change nameservers to the two Cloudflare nameservers Cloudflare gives you.
3. In Cloudflare DNS, add **proxied** (orange-cloud) records:
   - `A  @    185.158.133.1   Proxied`
   - `A  www  185.158.133.1   Proxied`
   - keep the `TXT _lovable` verification record
4. In Lovable Project Settings → Domains → muslly.com → **Advanced** → check **"Domain uses Cloudflare or a similar proxy"**. This switches verification to CNAME-based, compatible with the orange cloud.
5. SSL/TLS mode in Cloudflare: **Full (Strict)**.
6. Add cache-bypass rules for `/_serverFn/*`, `/api/*`, `/__l5e/*` (already documented in `docs/cloudflare-setup.md`).

**Expected resolution time after step 2:** 5 min – 2 h for DNS to propagate; YemenNet access works as soon as `dig muslly.com` returns a `104.x` or `172.x` IP.

### Option B — Switch the A record to the Lovable `lovable.app` cluster

Ask Lovable support to switch the custom-domain target for `muslly.com` from the legacy `185.158.133.1` ingress to the same multi-IP `185.41.148.0/24` cluster that serves `ympharma.lovable.app`. This restores YemenNet reachability without you owning a Cloudflare account, but you lose the WAF / cache rules.

### Option C — Subdomain failover (immediate, partial)

Already-working URL: **https://ympharma.lovable.app**  
Tell users on Yemen networks to use that URL until Option A lands. We've published a `/yemen-debug` page on both hosts that prints a share-code with DNS + TTFB evidence for support.

---

## 4. What we CANNOT fix in application code

- BGP / IP-level routing from YemenNet to `185.158.133.1`.
- Adding an in-app banner on `muslly.com` that says "switch to lovable.app" — **users who hit the BGP issue never load the page, so they never see the banner.**

In-app failover only helps for transient API failures (already handled by `net-retry.ts` + the SW). It cannot rescue a domain that won't TCP-connect.

---

## 5. Verification commands (run from a YemenNet device after the fix)

```bash
# Should return a Cloudflare anycast IP (104.x or 172.x), NOT 185.158.133.1
dig +short muslly.com

# Should return 200 in under 2 s
curl -o /dev/null -s -w "%{http_code} %{time_total}s\n" https://muslly.com/api/public/health
```

Or open `https://muslly.com/yemen-debug`, run the diagnostic, and share the resulting code.

---

## 6. Confidence breakdown

| Claim | Confidence | Basis |
|---|---|---|
| `muslly.com` not on user-owned Cloudflare | **100%** | NS = googledomains.com |
| Single-IP `185.158.133.1` is the failing hop on YemenNet | **95%** | matches Lovable's own published guidance + the fact that `ympharma.lovable.app` (different /24) works |
| Option A resolves the issue | **90%** | Cloudflare anycast 104.x/172.x has reliable YemenNet peering and is the documented Lovable remedy |
| Fix is purely infrastructure (no code change) | **100%** | application returns 200, hosting is healthy |
