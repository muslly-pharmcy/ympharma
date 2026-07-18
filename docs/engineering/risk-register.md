# Risk Register

Living document. Owner: Principal Engineer. Reviewed monthly.

Severity: **C** Critical / **H** High / **M** Medium / **L** Low.
Status: `open` / `mitigating` / `accepted` / `closed`.

| ID | Risk | Sev | Likelihood | Impact | Mitigation | Owner | Status |
|----|------|-----|------------|--------|------------|-------|--------|
| R-001 | Cloudflare Worker cold-start latency on cron endpoints | M | Medium | Minor delay in tick loops | Keep-warm via `pg_cron` every 5 min; monitor via `ai_world_health` | Platform | mitigating |
| R-002 | `supabaseAdmin` leak into client bundle | C | Low | Full data breach | CI import guard (`scripts/check-imports.ts`); `.server.ts` naming; PR review | Security | mitigating |
| R-003 | AI prompt injection extracting PII | H | Medium | PII exposure | `src/core/ai-safety/` redaction + injection detection; approval gate for high-risk actions | AI | mitigating |
| R-004 | RLS policy regression on new table | H | Medium | Cross-tenant data leak | `public-schema-grants` policy + `supabase--linter` gate | Security | mitigating |
| R-005 | Webhook replay / spoofing (WhatsApp, Twilio) | H | Low | Fake events trigger agents | HMAC signature verification in every `api/public/*/webhook.ts` | Integrations | closed |
| R-006 | pg_cron job silently failing | M | Medium | Silent SLA breach | `OPS-P2-002` cron monitor + Slack alerts on missed runs | Platform | closed |
| R-007 | Runaway AI cost from a stuck agent loop | H | Low | Credit exhaustion | Global kill switch (`alert_settings.ai_enabled`); per-agent rate limits | Finance | mitigating |
| R-008 | Supabase daily quota exhaustion | M | Low | App outage | Slow-query monitor + connection pool; observability in `/admin-system-health` | Platform | mitigating |
| R-009 | Third-party integration outage (n8n, WhatsApp, Meta) | M | Medium | Feature degradation | `INT-P3-006` integration health checks + graceful fallback | Integrations | mitigating |
| R-010 | Service worker cache serves stale critical assets | L | Medium | UI confusion | `sw-update-banner.tsx` prompts refresh on new build | Frontend | closed |
| R-011 | Backup restore untested | H | Low | Unrecoverable data loss | `src/core/backup/BackupRestoreTest.ts` nightly verification | Platform | mitigating |
| R-012 | Loss of single-maintainer knowledge | H | High | Delivery slowdown | Docs under `docs/engineering/`; keep README + runbooks current | People | mitigating |
| R-013 | Fictional-blueprint scope creep (duplicate tables/agents) | M | High | Tech debt + build failures | Reality-check refusal protocol; consolidation reports | Engineering | mitigating |
| R-014 | Client-side role check bypass | C | Low | Privilege escalation | All privileged reads via `has_role()` server-side; never trust localStorage | Security | closed |

## Change log
- 2026-06-28 — Initial register (Phase 3 RISK-P3-005).
