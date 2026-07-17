import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  const s = ctx.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listPushCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("ai_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    return { campaigns: data ?? [] };
  });

const CreateCampaign = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  frequency: z.enum(["daily", "72_hours", "weekly"]),
  content_type: z.string().max(50).default("medical_tip"),
});
export const createPushCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCampaign.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error, data: row } = await context.supabase
      .from("ai_campaigns")
      .insert({
        name: data.name,
        description: data.description ?? null,
        frequency: data.frequency,
        content_type: data.content_type,
        active: true,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { campaign: row };
  });

const ToggleInput = z.object({ id: z.string().uuid(), active: z.boolean() });
export const togglePushCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("ai_campaigns")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pushCampaignStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [{ count: subs }, { count: sent7d }, { count: clicked7d }] = await Promise.all([
      context.supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("active", true),
      context.supabase
        .from("campaign_deliveries")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", since)
        .eq("status", "sent"),
      context.supabase
        .from("campaign_deliveries")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", since)
        .not("clicked_at", "is", null),
    ]);
    const sent = sent7d ?? 0;
    return {
      activeSubscribers: subs ?? 0,
      sent7d: sent,
      clicked7d: clicked7d ?? 0,
      ctr7d: sent > 0 ? ((clicked7d ?? 0) / sent) * 100 : 0,
    };
  });
