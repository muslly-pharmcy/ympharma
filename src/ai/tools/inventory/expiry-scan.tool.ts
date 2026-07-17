import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

export class ExpiryScanTool implements AITool {
  name = "expiry_scan";
  description = "List active (unacknowledged) expiry alerts.";
  permissions = ["expiry.alert.read"];

  async execute(_input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("inv_expiry_alerts")
      .select("id, batch_id, tier, qty_at_alert, expiry_date, acknowledged_at")
      .is("acknowledged_at", null)
      .order("expiry_date", { ascending: true })
      .limit(50);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
