import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectorManager } from "./connector-manager";

/**
 * runHealthCheck — pings each connector, writes a row per system into
 * ai_world_health. Returns a summary for the caller.
 */
export async function runHealthCheck(
  manager: ConnectorManager,
  db: SupabaseClient,
): Promise<{ checked: number; online: number; offline: number }> {
  const connectors = manager.list();
  let online = 0;
  let offline = 0;
  const rows: Array<{
    system_name: string;
    status: string;
    metrics: Record<string, unknown>;
  }> = [];
  for (const c of connectors) {
    try {
      const h = await c.health();
      if (h.status === "online") online += 1;
      else offline += 1;
      rows.push({
        system_name: c.name,
        status: h.status,
        metrics: h.metrics ?? {},
      });
    } catch (e) {
      offline += 1;
      rows.push({
        system_name: c.name,
        status: "offline",
        metrics: { error: e instanceof Error ? e.message : String(e) },
      });
    }
  }
  if (rows.length) {
    await db.from("ai_world_health").insert(rows);
  }
  return { checked: connectors.length, online, offline };
}
