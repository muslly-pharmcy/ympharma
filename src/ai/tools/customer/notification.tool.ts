import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

export class NotificationTool implements AITool {
  name = "notification_send";
  description = "Create an in-app notification. Requires approval.";
  permissions = ["customer.message"];
  mutates = true;

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const payload = input as {
      _approved?: boolean;
      user_id?: string;
      title?: string;
      body?: string;
      type?: string;
    };
    if (!payload._approved) return { ok: false, error: "APPROVAL_REQUIRED" };
    if (!payload.user_id || !payload.title) return { ok: false, error: "USER_AND_TITLE_REQUIRED" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: payload.user_id,
        title: payload.title,
        body: payload.body ?? "",
        type: payload.type ?? "info",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
