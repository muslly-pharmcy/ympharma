// SCALE-P4-003 — Configuration knobs for horizontal scaling.
// The Worker runtime is stateless, so scaling means increasing concurrency
// (multiple isolates) and pushing shared state to the database. These
// constants document the assumed limits and are consumed by workers.

export const SCALING = {
  /** Max concurrent background jobs per isolate. */
  maxConcurrencyPerIsolate: 8,
  /** Max in-flight orchestrator ticks across the fleet (pg_cron enforced). */
  maxOrchestratorTicks: 1,
  /** Soft cap for DB pool usage per request. */
  maxDbConnectionsPerRequest: 2,
  /** Redis-like cache TTL for hot reads (ms). Falls back to in-memory. */
  cacheTtlMs: 30_000,
  /** Batch size for bulk inserts (events, decisions). */
  bulkInsertBatch: 250,
  /** Rate-limit window (ms) for public-facing endpoints. */
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 120,
} as const;

export type ScalingConfig = typeof SCALING;
