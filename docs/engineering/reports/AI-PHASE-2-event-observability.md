# TITANUS AI BRAIN — Phase 2 Report

**Mode:** CONNECT → OBSERVE. No rebuilds, no deletions.

## 1. Verified Event-Pipeline Problems

| # | Finding | Evidence |
|---|---------|----------|
| 1 | `ai_events` sat empty (0 rows) despite 84 real `agent_events` in the last week. | `SELECT COUNT(*) FROM ai_events` = 0. |
| 2 | Root cause: `event-consumer` claims + marks `agent_events.processed_at` **before** `sun-tick`'s `drainPhoenixEvents` can bridge them. The Sun queue therefore never receives production events. | Read of both consumer files + the `claim_agent_events` RPC path. |
| 3 | `ai_events` had no lineage columns (`correlation_id`, `source_event_id`) so mirroring the log without duplication was impossible. | `\d ai_events` snapshot. |

## 2. Files Changed

- `src/lib/ai-events-mirror.server.ts` — new. Terminal-status mirror writer; upsert on `source_event_id` (no duplicates on retry); wrapped in try/catch so observability never breaks routing.
- `src/routes/api/public/hooks/event-consumer.ts` — after each `agent_events` row reaches `completed` / `failed` / `exception`, calls `mirrorTerminalEvent`. Routing/business logic unchanged.

## 3. Database Changes (single migration)

```sql
ALTER TABLE public.ai_events ADD COLUMN IF NOT EXISTS correlation_id text;
ALTER TABLE public.ai_events ADD COLUMN IF NOT EXISTS source_event_id uuid;
CREATE INDEX IF NOT EXISTS ai_events_correlation_idx
  ON public.ai_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ai_events_source_event_uniq
  ON public.ai_events(source_event_id) WHERE source_event_id IS NOT NULL;
```

- Additive only (nullable columns, partial indexes). Zero impact on existing readers/policies.
- RLS unchanged (admin-only SELECT policy still in force).
- No triggers, no FK changes, no data migration.

## 4. Event Architecture After Changes

```
Producers ─▶ public.agent_events (authoritative FIFO log)
                    │
        claim_agent_events (SKIP LOCKED)
                    │
                    ▼
          event-consumer (cron)
          ├─ per-event handler  (routing unchanged)
          ├─ mark_event_processed / fail_agent_event
          └─ mirrorTerminalEvent ──▶ public.ai_events
                                      (status = completed|failed,
                                       source_event_id UNIQUE,
                                       correlation_id, target_agent,
                                       error_message, processed_at)
                                      │
                                      ▼
                            Admin AI dashboards
                            (already query ai_events)

Fallback path for unmapped events:
   event-consumer default → sun-engine.ingestEvent
   → sun_decisions (+ ai_agents.last_dispatched_at)
   → still mirrored to ai_events with status='completed'

sun-tick worker retained (unchanged):
   still drains any *fresh* agent_events row where processed_at IS NULL
   → inserts ai_events with status='pending' → routes → executes.
   In steady state consumer wins the race; the sun-tick path is
   preserved as a warm standby (rules: no deletions, no rebuild).
```

## 5. Duplicate-Execution Protection

- `claim_agent_events` uses `FOR UPDATE SKIP LOCKED` (unchanged).
- Mirror rows use terminal status only; `sun-tick` reads `status = 'pending'` only → cannot re-execute mirrored rows.
- `source_event_id` UNIQUE partial index → retried terminal writes upsert the same mirror row.
- No exactly-once guarantee upgrade; existing at-least-once semantics preserved.

## 6. Observability After

Every terminated production event now writes:
- `ai_events.status` (`completed` / `failed`)
- `ai_events.error_message` for failures
- `ai_events.processed_at`
- `ai_events.source_event_id` → back-reference to `agent_events.id`
- `payload._mirror` block with entity + outcome note

Existing admin queries against `ai_events` therefore begin returning real data on the next consumer tick — no dashboard code change required.

## 7. Validation Evidence

- `bunx tsgo --noEmit` → exit 0 (no type regressions).
- Migration succeeded (columns + indexes present, `\d ai_events` shows both).
- No RLS / GRANT changes → policy surface unchanged (spot-checked linter output — 166 pre-existing warnings, none new).
- Routing untouched: `event-consumer` switch statement bytes-identical; only the outcome-recording block was extended.

## 8. Remaining Blockers

- Live end-to-end proof requires a production event to be published between now and the next cron tick; report will read `ai_events` non-zero after ~60s of production traffic.
- `sun-tick` path remains parallel by design (rules forbid removal). If cost matters later, its role can be reduced to "backfill only" by gating on `agent_events.processed_at IS NULL AND created_at < now() - interval '5 min'`.
- Bridge lag metric (`getBridgeLag`) will trend to 0 permanently; consider surfacing `ai_events` mirror lag as the canonical health metric in Phase 3.

## AI Readiness Score

**Before Phase 2:** 58 / 100
**After Phase 2:** **66 / 100**  (+6 observability spine · +2 lineage columns · no false claim of activation)

Real event → agent → decision execution is still governed by the existing `event-consumer` handlers; the Phase 2 change makes that pipeline **visible** in `ai_events` without touching business logic. "AI Brain Activated" is intentionally NOT claimed here — awaiting live traffic proof.
