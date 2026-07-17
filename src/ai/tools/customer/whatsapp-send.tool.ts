import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

/**
 * WhatsappSendTool — MUTATING. Queues an outbound WhatsApp dispatch row
 * for the existing WhatsApp brain worker to send.
 */
export class WhatsappSendTool implements AITool {
  name = "whatsapp_send";
  description = "Queue an outbound WhatsApp message. Requires approval.";
  permissions = ["customer.message"];
  mutates = true;

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const payload = input as {
      _approved?: boolean;
      to?: string;
      body?: string;
      correlation_id?: string;
    };
    if (!payload._approved) return { ok: false, error: "APPROVAL_REQUIRED" };
    if (!payload.to || !payload.body) return { ok: false, error: "TO_AND_BODY_REQUIRED" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("whatsapp_notification_dispatch")
      .insert({
        event_id: crypto.randomUUID(),
        event_name: "AI_TOOL_DISPATCH",
        recipient_phone: payload.to,
        rendered_body: payload.body,
        status: "queued",
        correlation_id: payload.correlation_id ?? null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
