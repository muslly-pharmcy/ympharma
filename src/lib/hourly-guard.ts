// Hard end-date for the hourly self-care cron family.
// After this instant, the hooks no-op so they stop touching prod without a code change.
export const HOURLY_CRON_END_AT = new Date("2028-01-01T00:00:00Z");

export function hourlyCronExpired(): boolean {
  return new Date() >= HOURLY_CRON_END_AT;
}

export function expiredResponse() {
  return Response.json({
    ok: true,
    skipped: true,
    reason: "hourly-cron-window-ended",
    ended_at: HOURLY_CRON_END_AT.toISOString(),
  });
}
