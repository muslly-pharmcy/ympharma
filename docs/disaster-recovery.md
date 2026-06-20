# Disaster Recovery Plan — Pharmacy Platform

_Last updated: 2026-06-19 — covers BLOCK-1/2/3 remediations._

## Recovery objectives

| Asset                  | RPO    | RTO    | Backup mechanism                                                  |
| ---------------------- | ------ | ------ | ----------------------------------------------------------------- |
| Orders                 | 0      | < 5 m  | Idempotent client queue (`orders-pending.ts`) + DB row + daily DB backup |
| Prescriptions (rows)   | 24 h   | < 15 m | `create_scheduled_backup('daily')` cron at 02:00 UTC              |
| Prescription images    | 24 h   | < 30 m | `prescription_image_blobs` (bytea) snapshotted by daily DB backup |
| Catalog / offers       | 24 h   | < 5 m  | Daily DB backup                                                   |
| Admin/auth             | ~30 m  | < 30 m | Managed Supabase auth                                             |

## BLOCK-1: Zero order loss

- Order submission writes to `localStorage` queue (`orders:pending:v1`) **before** the network call (`src/lib/orders-pending.ts:enqueue`).
- `persistAndCommit` uses `withRetry` (5 attempts, exp. backoff up to 9 s, paused while offline).
- DB insert is idempotent (`SELECT id WHERE id=…` then `INSERT`).
- Cart UI awaits success before navigating; on failure the order **stays queued** and is retried automatically on next app boot via `drainPendingOrders()` wired into `__root.tsx`.

## BLOCK-2: Collision-free order IDs

- `generateOrderId()` uses `crypto.randomUUID()` (48 bits of entropy retained → P(collision) at 1 M orders ≈ 1.7e-9).
- Format: `AM-XXXXXXXXXXXX` (12 hex chars), preserves Arabic-friendly tracker UX.

## BLOCK-3: Prescription image protection

- After each successful upload + DB commit, the client calls `backupRxImage` server function (`src/lib/rx-backup.functions.ts`).
- Server function stores image bytes in `public.prescription_image_blobs` (bytea, UNIQUE on `(rx_id, sha256)` → idempotent).
- `create_scheduled_backup('daily')` runs nightly and records `image_blob_count` in the backup payload.
- `verify_prescription_image_coverage()` admin RPC returns coverage % for the admin dashboard.

### Restore procedure (storage bucket loss)

1. Identify affected rx ids from `prescriptions.created_at`.
2. For each, read rows from `prescription_image_blobs WHERE rx_id IN (…)`.
3. Re-upload `content_bytes` to storage at `storage_path` using service-role client (`supabaseAdmin.storage.from('prescriptions').upload(storage_path, bytes, { contentType, upsert: true })`).
4. Validate via `verify_prescription_image_coverage()` (coverage should stay 100%).

### Verification cadence

- Daily: cron creates DB backup, payload contains `image_blob_count`.
- Weekly: admin runs `verify_prescription_image_coverage()` from `/admin` — coverage must remain ≥ 99%.
- Manual: `create_backup('manual')` downloads JSON snapshot via `src/lib/backup.ts`.

---

## BLOCK-4: Coverage expansion (Batch 6 / M13)

The daily/weekly snapshots produced by `create_scheduled_backup()` capture the
**entire `public` schema**, so the following tables — flagged in §9 of the
2026-06 CTO audit — are now explicitly covered by the existing job:

| Table | Purpose | Why it matters in DR |
| ----- | ------- | -------------------- |
| `inventory_audit_log` | Append-only RESERVE/RELEASE ledger | Required to reconstruct stock movements during a partial restore |
| `inventory_reservation_state` | Idempotency keys for stock reservations | Restoring orders without this would re-deduct stock |
| `agent_events` / `agent_events_dlq` | Event bus + dead-letter queue | Required to resume in-flight automation |
| `agent_runs` / `agent_actions` | Agent execution + recommendation ledger | Required for audit-trail completeness |
| `staff_alerts` / `operations_alerts` | Operational signals | Required to reissue unresolved alerts after restore |
| `event_consumer_schedule_log` | Cron install/uninstall history | Required to reproduce the consumer pg_cron job |

Schedule verification: admins can call the new
`public.get_backup_schedule()` RPC (or read `cron.job` directly) to confirm
`backup-daily` (02:00 UTC) and `backup-weekly` (Sunday 03:00 UTC) are active.

## BLOCK-5: End-to-end traceability (Batch 6 / M9)

Every order now carries an auto-generated `correlation_id` propagated by
trigger into `inventory_audit_log` and `inventory_reservation_state`, and is
echoed by application code into `agent_events`, `agent_actions`,
`agent_runs`, and `staff_alerts`. A single index query
(`WHERE correlation_id = $1`) reconstructs the full incident timeline across
the whole lifecycle.
