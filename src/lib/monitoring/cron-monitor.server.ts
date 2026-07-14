// Server-only cron health monitor.
//
// OPS-P2-002 Batch 1: inspects `cron.job_run_details` for the last 24 hours
// and flags jobs that have either (a) no successful run in the window, or
// (b) >= MAX_CONSECUTIVE_FAILURES consecutive failed runs. Optionally
// dispatches a Slack alert for unhealthy entries.
//
// Not client-reachable: imported only from server functions / cron hooks
// (Batch 2 will wire this into a scheduled endpoint).

import { sendSlackAlert } from "@/lib/notifications/slack-alerts.server";

const LOOKBACK_HOURS = 24;
const MAX_CONSECUTIVE_FAILURES = 3;

export type CronHealthStatus = "healthy" | "stale" | "failing";

export interface CronHealthEntry {
  jobName: string;
  lastRun: string | null;
  lastStatus: string | null;
  consecutiveFailures: number;
  totalRuns: number;
  status: CronHealthStatus;
}

interface JobRow {
  jobid: number;
  jobname: string;
}

interface RunRow {
  jobid: number;
  status: string;
  start_time: string;
}

export async function checkCronHealth(): Promise<CronHealthEntry[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // `cron` schema is not in the generated Database types; access via untyped client.
  const cron = (supabaseAdmin as unknown as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (cols: string) => {
          returns: <T>() => Promise<{ data: T | null; error: Error | null }>;
          gte: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              returns: <T>() => Promise<{ data: T | null; error: Error | null }>;
            };
          };
        };
      };
    };
  }).schema("cron");

  const { data: jobs, error: jobsError } = await cron
    .from("job")
    .select("jobid, jobname")
    .returns<JobRow[]>();
  if (jobsError) throw jobsError;
  if (!jobs || jobs.length === 0) return [];

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const { data: runs, error: runsError } = await cron
    .from("job_run_details")
    .select("jobid, status, start_time")
    .gte("start_time", since)
    .order("start_time", { ascending: false })
    .returns<RunRow[]>();
  if (runsError) throw runsError;

  const runsByJob = new Map<number, RunRow[]>();
  for (const r of runs ?? []) {
    const arr = runsByJob.get(r.jobid) ?? [];
    arr.push(r);
    runsByJob.set(r.jobid, arr);
  }

  return jobs.map((j) => {
    const jobRuns = runsByJob.get(j.jobid) ?? [];
    let consecutiveFailures = 0;
    for (const r of jobRuns) {
      if (r.status === "succeeded") break;
      consecutiveFailures += 1;
    }
    const last = jobRuns[0];
    const hasRecentSuccess = jobRuns.some((r) => r.status === "succeeded");
    const status: CronHealthStatus = !hasRecentSuccess
      ? jobRuns.length === 0
        ? "stale"
        : "failing"
      : consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
        ? "failing"
        : "healthy";
    return {
      jobName: j.jobname,
      lastRun: last?.start_time ?? null,
      lastStatus: last?.status ?? null,
      consecutiveFailures,
      totalRuns: jobRuns.length,
      status,
    };
  });
}

export async function dispatchCronAlerts(report: CronHealthEntry[]): Promise<{
  alerted: number;
}> {
  const unhealthy = report.filter((r) => r.status !== "healthy");
  if (unhealthy.length === 0) return { alerted: 0 };

  const body = unhealthy
    .map(
      (r) =>
        `• ${r.jobName} [${r.status}] last=${r.lastRun ?? "never"} ` +
        `failures=${r.consecutiveFailures}/${r.totalRuns}`,
    )
    .join("\n");

  const severity =
    unhealthy.some((r) => r.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
      ? "critical"
      : "high";

  const sent = await sendSlackAlert({
    title: `Cron health: ${unhealthy.length} job(s) unhealthy`,
    body,
    severity,
    source: "cron-monitor",
    payload: { unhealthy_count: unhealthy.length, lookback_hours: LOOKBACK_HOURS },
  });

  return { alerted: sent ? unhealthy.length : 0 };
}
