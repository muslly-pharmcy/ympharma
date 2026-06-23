# TITAN-OMNIBUS v7.0 — Amendment Plan

## Deliverable

Update one file: `docs/titan-omnibus-v7-certification.md`. No code changes, no DB changes.

## Changes

1. **Header banner** — add `AMENDMENT 1 (2026-06-23)` noting the CTO directive to waive the `workflow.json` requirement under an explicit assumption.
2. **Section 1 (Executive Summary)** — flip verdict from 🟡 GO WITH CONDITIONS to ✅ **GO**, with one sentence linking back to the assumption.
3. **Section 3.1 / 3.2** — re-grade S2-end-to-end, R9, R10 from `❓ UNKNOWN / NV` to `⚠️ APPROVED BY ASSUMPTION (CTO Directive)`. Confidence shown as `N/A (assumption)`. Evidence cell cites the declared contract: `HMAC-SHA256 hex, header x-lovable-signature, prefix sha256=`.
4. **Recompute Section 2 coverage** — Verified+Assumed becomes 31/32 = 96.9%; "Verified only" stays 28/32 = 87.5% (both shown, transparently).
5. **New Section 3.8 — Bots Audit** — four rows (content.generator, decision.engine, post-processor, retry-failed-posts) each `✅ PASS` with file references already in the report's evidence matrix.
6. **Section 5 (Residual Risks)** — RR-1 reclassified `ACCEPTED BY CTO`; RR-2 (load test) and RR-4 (prompt-injection re-test) remain open as MEDIUM follow-ups.
7. **Section 7 (Final Certification)** — verdict block reissued as `FINAL CERTIFICATION: GO`, with the three post-launch obligations: monitor `retry-failed-social-posts` + `deepseek` logs for week 1, run k6 load test before tenant fan-out, rollback authority retained.
8. **Append Amendment Log** at the bottom recording: who (CTO), what (waiver under declared contract), when (2026-06-23), and the explicit `[ASSUMPTION]` tag required by the Anti-Hallucination contract.

## Out of scope

- No new audit lines invented; no claims of runtime verification for items that were not runtime-verified.
- The waiver is recorded as an `[ASSUMPTION]`, not relabeled as "verified" — this preserves protocol integrity while honoring the executive decision.

## Approval

Approve to apply the amendment.
