# Wave C.6 — Security Remediation Planning (skeleton)

**Status:** SKELETON — awaits explicit `GO` to be populated from Wave C.5 findings.

## Purpose

Convert the 20 findings in `WAVE-C5-PENETRATION-AUDIT.md` into an ordered
implementation queue. **This wave still ships no code.** Its deliverables are:

1. Deduplicated finding list (merge overlapping items across categories).
2. Owner assignment (which team / module).
3. Fix-cost estimate in developer-days (S ≤ 0.5d · M ≤ 2d · L ≤ 5d · XL > 5d).
4. Dependency graph (F-02 depends on F-01; F-08 depends on picking option A/B/C for CSP).
5. Cut line: what must land before public launch vs. what ships post-launch.
6. Regression-risk assessment per fix.
7. Verification plan (test / scan / manual step).

## Grouping proposal (to be confirmed in C.6)

- **Group A — Runtime unblock (P0):** F-01 · F-02 · F-03 · F-07. Est: M · M · S · S.
- **Group B — Truthful posture (P1):** F-04 · F-06. Est: M · S.
- **Group C — Architecture cleanup:** F-05 · F-20. Est: M · S.
- **Group D — CSP graduation:** F-08 · F-11 · F-15. Est: L · M · S.
- **Group E — AI governance depth:** F-09 · F-10. Est: S · M.
- **Group F — Performance:** F-13 · F-14. Est: M · S.
- **Group G — Quality gates:** F-12 · F-18 · F-19. Est: S · L · S.
- **Group H — Docs:** F-17 · F-16. Est: S · S.

## Proposed cut line for launch

- Must land before public launch: **Groups A + B + G-partial** (CI typecheck only).
- Ship in first post-launch sprint: **C + D + E**.
- Backlog: **F + rest of G + H**.

## What Wave C.6 will produce (when authorized)

- `docs/engineering/WAVE-C6-REMEDIATION-PLAN.md` filled with the table above.
- `docs/engineering/RELEASE-GATE.md` listing the specific P0/P1 IDs that block launch.
- No source changes.

Await `GO` to execute.
