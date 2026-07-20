# Release Gate — MUSLLY AI OS

**Source:** `WAVE-C6-REMEDIATION-PLAN.md` §4 Phase R0.
**Rule:** Public soft-launch is blocked until every ID below reports
`RESOLVED` in `WAVE-C5-PENETRATION-AUDIT.md`.

## Launch-blocking findings (Phase R0)

| ID | Title | Owner | Effort | Status |
|---|---|---|---|---|
| F-01 | Supabase env unresolved on `/` (root-cause differentiation required) | Backend + DevOps | S–M | ⛔ Open |
| F-03 | Public POST endpoints unmetered — shared guard not wired | Backend + Security | M | ⛔ Open |
| F-02 | `_authenticated` SSR decision record + minimal guard-rails | Backend | M | ⛔ Open |
| F-07 | `inventory.functions.ts` missing `requireSupabaseAuth` | Backend + Security | S | ⛔ Open |
| F-06 | `.env.example` rewrite to real contract | Docs + DevOps | XS | ⛔ Open |
| F-04 (hide) | `SecurityModule` hidden behind debug flag | Frontend + Security | S | ⛔ Open |
| F-12 (partial) | CI: `lint + tsgo + test` job on PR + `main` | DevOps | S | ⛔ Open |

## Non-blocking (may ship post-launch)

See Phases R1, R2, R3 in `WAVE-C6-REMEDIATION-PLAN.md`.

## Update protocol

When a finding is closed in Wave C.7:

1. Mark the row above `✅ Resolved (commit <sha>)`.
2. Update `WAVE-C5-PENETRATION-AUDIT.md` finding status.
3. Append entry to `WAVE-C7-REGRESSION-LOG.md`.
