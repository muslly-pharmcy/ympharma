// Event Bus server fns — list / stats / mark-processed for agent_events.
// Admin/owner only. Reads through the user-scoped supabase client (RLS-enforced).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isOwner } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never);
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

const ListInput = z.object({
  status: z.enum(["UNPROCESSED", "PROCESSED", "ALL"]).default("ALL"),
  event_name: z.string().max(64).optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listAgentEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("agent_events")
      .select("id, event_name, entity_type, entity_id, source, payload, occurred_at, processed_at, processed_by, retry_count, last_error")
      .order("occurred_at", { ascending: false })
      .limit(data.limit);
    if (data.status === "UNPROCESSED") q = q.is("processed_at", null);
    if (data.status === "PROCESSED") q = q.not("processed_at", "is", null);
    if (data.event_name) q = q.eq("event_name", data.event_name);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: rows ?? [] };
  });

export const agentEventStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("agent_events")
      .select("event_name, processed_at, occurred_at, retry_count, last_error")
      .gte("occurred_at", since)
      .limit(5000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ event_name: string; processed_at: string | null; occurred_at: string; retry_count: number; last_error: string | null }>;
    const byName: Record<string, { total: number; processed: number; failed: number; avg_ms: number }> = {};
    let totalUnprocessed = 0;
    let oldestUnprocessedMs = 0;
    const now = Date.now();
    for (const r of rows) {
      const k = r.event_name;
      const slot = (byName[k] ??= { total: 0, processed: 0, failed: 0, avg_ms: 0 });
      slot.total += 1;
      if (r.processed_at) {
        slot.processed += 1;
        const ms = new Date(r.processed_at).getTime() - new Date(r.occurred_at).getTime();
        slot.avg_ms = slot.avg_ms + (ms - slot.avg_ms) / slot.processed;
      } else {
        totalUnprocessed += 1;
        const age = now - new Date(r.occurred_at).getTime();
        if (age > oldestUnprocessedMs) oldestUnprocessedMs = age;
      }
      if (r.last_error) slot.failed += 1;
    }
    const ALERT_BACKLOG = 25;
    const ALERT_AGE_MIN = 30;
    const alerts: Array<{ kind: string; message: string }> = [];
    if (totalUnprocessed >= ALERT_BACKLOG) {
      alerts.push({ kind: "backlog", message: `Unprocessed events: ${totalUnprocessed} (>= ${ALERT_BACKLOG})` });
    }
    if (oldestUnprocessedMs >= ALERT_AGE_MIN * 60 * 1000) {
      alerts.push({ kind: "stale", message: `Oldest unprocessed age: ${Math.round(oldestUnprocessedMs / 60000)}m` });
    }
    return {
      ok: true as const,
      window_hours: 24,
      total: rows.length,
      total_unprocessed: totalUnprocessed,
      oldest_unprocessed_ms: oldestUnprocessedMs,
      by_event: byName,
      alerts,
    };
  });

const MarkInput = z.object({ id: z.string().uuid(), processor: z.string().max(64).default("admin-manual") });

export const markAgentEventProcessed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MarkInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("agent_events")
      .update({ processed_at: new Date().toISOString(), processed_by: data.processor } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Batch 5b — DLQ surface for the admin event-bus page.
export const agentEventsDlqStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("agent_events_dlq_stats" as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, stats: JSON.parse(JSON.stringify(data ?? {})) as Record<string, number | string | Record<string, number>> };
  });

const DlqListInput = z.object({
  unresolved_only: z.boolean().default(true),
  limit: z.number().int().min(1).max(200).default(50),
});

type DlqRow = {
  id: string; original_id: string; event_name: string;
  entity_type: string | null; entity_id: string | null;
  retry_count: number; last_error: string | null;
  failed_at: string; resolved_at: string | null; resolution_note: string | null;
};

export const listAgentEventsDlq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DlqListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("agent_events_dlq" as never)
      .select("id, original_id, event_name, entity_type, entity_id, retry_count, last_error, failed_at, resolved_at, resolution_note")
      .order("failed_at", { ascending: false })
      .limit(data.limit);
    if (data.unresolved_only) q = q.is("resolved_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: ((rows ?? []) as unknown as DlqRow[]) };
  });

// Batch 5b — install/refresh the pg_cron schedule that drives the consumer
// every minute. Reads CRON_SECRET from the server env so the secret never
// appears in a migration, client bundle, or admin UI.
export const installEventConsumerSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Strict perms: only admin/owner can invoke the service_role RPC.
    await assertAdmin(context);
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new Error("CRON_SECRET not configured on the server");

    const correlationId =
      (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("schedule_event_consumer" as never, {
      _cron_secret: secret,
    } as never);

    const parsed = (JSON.parse(JSON.stringify(data ?? {})) as {
      ok?: boolean; job_id?: number; job_name?: string; schedule?: string;
      url?: string; batch?: number; active?: boolean; installed?: boolean; reinstalled?: boolean;
    });

    // Audit log — every install attempt, success or failure, tied to correlation_id.
    await supabaseAdmin.from("event_consumer_schedule_log" as never).insert({
      correlation_id: correlationId,
      action: parsed.reinstalled ? "reinstall" : "install",
      actor_user_id: context.userId,
      status: error ? "error" : "ok",
      job_id: parsed.job_id ?? null,
      job_name: parsed.job_name ?? "event-consumer-tick",
      schedule: parsed.schedule ?? null,
      url: parsed.url ?? null,
      batch: parsed.batch ?? null,
      error: error ? error.message : null,
    } as never);

    if (error) throw new Error(error.message);
    return { ok: true as const, correlation_id: correlationId, schedule: parsed };
  });

export const getEventConsumerSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("get_event_consumer_schedule" as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, schedule: (JSON.parse(JSON.stringify(data ?? {})) as { ok?: boolean; job_id?: number; job_name?: string; schedule?: string; url?: string; batch?: number; active?: boolean; installed?: boolean }) };
  });

// Batch 5c — read schedule install/reinstall audit log (admin/owner only via RLS).
export const listScheduleLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("event_consumer_schedule_log" as never)
      .select("id, correlation_id, action, actor_user_id, status, job_id, job_name, schedule, url, batch, error, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: (rows ?? []) as Array<{
      id: string; correlation_id: string; action: string; actor_user_id: string | null;
      status: string; job_id: number | null; job_name: string | null; schedule: string | null;
      url: string | null; batch: number | null; error: string | null; created_at: string;
    }> };
  });

// Batch 7+8 — surface throttling activity on /admin-event-bus.
// rate_limit_buckets has no anon/authenticated grants, so we read it via
// supabaseAdmin AFTER the admin check (assertAdmin) — same pattern as
// installEventConsumerSchedule above.
export const listThrottlingHits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("rate_limit_buckets" as never)
      .select("key, count, window_start, updated_at")
      .gte("count", 5)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const parsed = ((rows ?? []) as Array<{ key: string; count: number; window_start: string; updated_at: string }>).map((r) => {
      // key shape: 'place_order:phone:+9677...' or 'error_logs:ip:...' (future)
      const parts = r.key.split(":");
      const scope = parts[0] ?? "unknown";
      const subject_kind = parts[1] ?? "—";
      const subject = parts.slice(2).join(":") || "—";
      return {
        scope, subject_kind, subject,
        count: r.count, window_start: r.window_start, updated_at: r.updated_at,
        key: r.key,
      };
    });
    return { ok: true as const, rows: parsed };
  });

