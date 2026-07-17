import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

export class ProductSearchTool implements AITool {
  name = "product_search";
  description = "Search catalog products by name (Arabic + English).";
  permissions = ["products.read"];

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const query = String((input as { query?: string })?.query ?? "").trim();
    if (!query) return { ok: false, error: "QUERY_REQUIRED" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("catalog_products")
      .select("id, name_ar, name_en, brand, form")
      .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%`)
      .limit(20);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
