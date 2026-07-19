// Hourly error triage: groups error_logs from the last hour by (source, message-signature),
// raises a deduped operations_alerts_v14 row per fingerprint that crosses the threshold.
// Read-only on error_logs (no auto-resolution). Auth: x-cron-secret.
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";
import { hourlyCronExpired, expiredResponse } from "@/lib/hourly-guard";

const SPIKE_THRESHOLD = 5; // distinct rows per signature within the hour

function fingerprint(source: string | null, message: string | null): string {
  const s = (source ?? "unknown").slice(0, 40);
  const m = (message ?? "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d+/g, "<n>")
    .slice(0, 160);
  return `${s}::${m}`;
}

export const Route = createFileRoute("/api/public/hooks/hourly-error-triage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;
        if (hourlyCronExpired()) return expiredResponse();

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const sinceIso = new Date(Date.now() - 60 * 60_000).toISOString();

          const { data: rows, error } = await supabaseAdmin
            .from("error_logs")
            .select("source,message,level")
            .gte("occurred_at", sinceIso)
            .in("level", ["error", "fatal", "critical"])
            .limit(2000);

          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          const groups = new Map<string, { count: number; sample: string }>();
          for (const r of rows ?? []) {
            const fp = fingerprint(r.source, r.message);
            const g = groups.get(fp) ?? { count: 0, sample: r.message ?? "" };
            g.count += 1;
            groups.set(fp, g);
          }

          let alertsCreated = 0;
          const hourBucket = new Date().toISOString().slice(0, 13);
          for (const [fp, g] of groups) {
            if (g.count < SPIKE_THRESHOLD) continue;
            const dedupeKey = `error-triage:${hourBucket}:${fp}`;
            const { error: alertErr } = await supabaseAdmin.from("operations_alerts_v14").insert({
              alert_type: "error_spike",
              message: `Error spike (${g.count}× in 1h) — ${g.sample.slice(0, 240)}`,
              dedupe_key: dedupeKey,
            });
            if (!alertErr) alertsCreated += 1;
          }

          return Response.json({
            ok: true,
            scanned: rows?.length ?? 0,
            groups: groups.size,
            alerts_created: alertsCreated,
            threshold: SPIKE_THRESHOLD,
          });
        } catch (e) {
          console.error("[cron hourly-error-triage]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
