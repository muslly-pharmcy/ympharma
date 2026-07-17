import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

export class PrescriptionCheckTool implements AITool {
  name = "prescription_check";
  description = "Read a prescription extraction by id and return summary.";
  permissions = ["prescription.read"];

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const id = String((input as { prescription_id?: string })?.prescription_id ?? "");
    if (!id) return { ok: false, error: "PRESCRIPTION_ID_REQUIRED" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("prescription_extractions")
      .select("id, extracted_data, confidence, status")
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
