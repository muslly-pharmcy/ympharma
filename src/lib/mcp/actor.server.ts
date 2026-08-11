// Bridge from an MCP ToolContext (verified OAuth token) to the app's Actor,
// so kernel dispatches from MCP carry the same org scoping as web requests.
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Actor } from "@/lib/session.server";

export async function actorFromToken(ctx: ToolContext): Promise<Actor> {
  const userId = ctx.getUserId();
  if (!userId) throw new Error("No user id on the verified token");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  const { data, error } = await sb
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("User has no organization membership");

  return {
    userId,
    organizationId: data.organization_id as string,
    role: data.role as Actor["role"],
    correlationId: crypto.randomUUID(),
  } as Actor;
}
