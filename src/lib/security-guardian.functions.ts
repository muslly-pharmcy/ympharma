import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SecEventRow {
  id: string;
  event_type: string;
  severity: string;
  source: string | null;
  risk_score: number;
  action_taken: string | null;
  resolved: boolean;
  created_at: string;
}

export interface AuditRow {
  id: string;
  actor: string | null;
  action: string;
  resource: string | null;
  result: string | null;
  created_at: string;
}

async function ensureAdmin(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
}) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("FORBIDDEN");
}

export const securityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    events: SecEventRow[];
    audit: AuditRow[];
    heatmap: Array<{ event_type: string; severity: string; count: number }>;
  }> => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [ev, au, hm] = await Promise.all([
      supabaseAdmin
        .from("ai_security_events")
        .select(
          "id, event_type, severity, source, risk_score, action_taken, resolved, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("ai_security_audit")
        .select("id, actor, action, resource, result, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("ai_security_events")
        .select("event_type, severity")
        .gte("created_at", since7d),
    ]);

    // Build heatmap counts
    const counts = new Map<string, number>();
    for (const r of hm.data ?? []) {
      const k = `${r.event_type}|${r.severity}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const heatmap = Array.from(counts.entries()).map(([k, count]) => {
      const [event_type, severity] = k.split("|");
      return { event_type, severity, count };
    });

    const events = ((ev.data ?? []) as SecEventRow[]).map((r) => ({
      id: r.id,
      event_type: r.event_type,
      severity: r.severity,
      source: r.source,
      risk_score: r.risk_score,
      action_taken: r.action_taken,
      resolved: r.resolved,
      created_at: r.created_at,
    }));

    const audit = ((au.data ?? []) as AuditRow[]).map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      resource: r.resource,
      result: r.result,
      created_at: r.created_at,
    }));

    return { events, audit, heatmap };
  });
