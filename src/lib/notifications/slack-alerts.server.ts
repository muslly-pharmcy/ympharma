// Server-only Slack alert wrapper.
// Centralizes formatting & delegates dispatch to the existing
// `sendSlack` (postWithRetry-backed) helper in alert-dispatch.server.ts.
//
// Scope: OPS-P2-002 Batch 1 — provides a single entrypoint for monitors
// (cron-monitor, future api-monitor) so future alert sources share one
// formatting / dispatch path.

import { sendSlack } from "@/lib/alert-dispatch.server";

export type AlertSeverity = "info" | "warning" | "high" | "critical";

export interface SlackAlertInput {
  title: string;
  body: string;
  severity?: AlertSeverity;
  source?: string;
  reportUrl?: string;
  payload?: Record<string, unknown> | null;
}

const DEFAULT_REPORT_URL =
  process.env.OPS_REPORT_URL ?? "https://ympharma.lovable.app/admin-system-health";

function formatBody(input: SlackAlertInput): string {
  const sev = (input.severity ?? "warning").toUpperCase();
  return `*[${sev}]* ${input.title}\n\`\`\`\n${input.body}\n\`\`\``;
}

export async function sendSlackAlert(input: SlackAlertInput): Promise<boolean> {
  return sendSlack({
    agent: input.source ?? "ops-monitor",
    severity: input.severity ?? "warning",
    message: formatBody(input),
    reportUrl: input.reportUrl ?? DEFAULT_REPORT_URL,
    payload: input.payload ?? null,
  });
}
