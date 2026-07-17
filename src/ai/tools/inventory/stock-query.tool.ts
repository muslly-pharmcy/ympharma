import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

export class StockQueryTool implements AITool {
  name = "stock_query";
  description = "Read branch inventory rows for a product.";
  permissions = ["inventory.read"];

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const productId = String((input as { product_id?: string })?.product_id ?? "");
    if (!productId) return { ok: false, error: "PRODUCT_ID_REQUIRED" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("branch_inventory")
      .select("branch_id, product_id, quantity, minimum_stock")
      .eq("product_id", productId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
