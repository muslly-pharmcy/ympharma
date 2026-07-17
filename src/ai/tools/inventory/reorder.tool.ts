import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

/**
 * ReorderTool — MUTATING. Requires human approval.
 */
export class ReorderTool implements AITool {
  name = "reorder";
  description = "Create a purchase recommendation. Requires admin approval.";
  permissions = ["procurement.recommend"];
  mutates = true;

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const payload = input as {
      _approved?: boolean;
      product_id?: string;
      recommended_qty?: number;
      supplier_id?: string;
      reason?: string;
      urgency?: string;
    };
    if (!payload._approved) return { ok: false, error: "APPROVAL_REQUIRED" };
    if (!payload.product_id) return { ok: false, error: "PRODUCT_ID_REQUIRED" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("purchase_recommendations")
      .insert({
        product_id: payload.product_id,
        recommended_qty: Number(payload.recommended_qty ?? 0),
        preferred_supplier_id: payload.supplier_id ?? null,
        reason: payload.reason ?? "ai_recommendation",
        urgency: payload.urgency ?? "normal",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
