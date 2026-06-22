// Marketing automation: queue reactivation, loyalty reminders, and restock alerts.
// Messages are queued into marketing_queue (status='pending') — actual sending is
// handled by the existing WhatsApp dispatch pipeline. Each run is logged into
// marketing_campaigns for auditability.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" } as never),
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "owner" } as never),
  ]);
  if (!isAdmin && !isOwner) throw new Error("forbidden");
}

type QueueRow = {
  campaign_kind: string;
  customer_phone: string;
  segment: string;
  reason: string;
  payload: Record<string, unknown>;
  message_text: string;
  status: "pending";
};

export const runReactivationCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().int().min(7).max(180).optional(), limit: z.number().int().min(1).max(500).optional() }).partial().parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = data.days ?? 30;
    const limit = data.limit ?? 50;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: inactive } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select("phone_number,last_message_at")
      .lt("last_message_at", cutoff)
      .order("last_message_at", { ascending: true })
      .limit(limit);

    const phones = ((inactive ?? []) as Array<{ phone_number: string }>).map((r) => r.phone_number);
    if (phones.length === 0) return { queued: 0 };

    const { data: offers } = await supabaseAdmin
      .from("products")
      .select("name,price")
      .eq("is_published", true)
      .gt("stock_qty", 0)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .limit(3);

    const offerText = ((offers ?? []) as Array<{ name: string; price: number }>)
      .map((o, i) => `${i + 1}. ${o.name} - ${o.price} ر.ي`)
      .join("\n");

    const message = `👋 مرحباً! اشتقنا لك. عروض خاصة لك:\n${offerText}\n\nاستخدم الكود WELCOME10 لخصم 10% على طلبك.`;

    const rows: QueueRow[] = phones.map((p) => ({
      campaign_kind: "reactivation",
      customer_phone: p,
      segment: `inactive_${days}d`,
      reason: `no_activity_since_${cutoff}`,
      payload: { offers: offers ?? [] },
      message_text: message,
      status: "pending",
    }));

    const { error } = await supabaseAdmin.from("marketing_queue").insert(rows);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("marketing_campaigns").insert({
      name: `إعادة تنشيط (${days} يوم)`,
      type: "reactivation",
      sent_to: rows.length,
      created_by: context.userId,
      metadata: { days, cutoff },
    });

    return { queued: rows.length };
  });

export const runLoyaltyReminderCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ maxPoints: z.number().int().min(1).max(10000).optional(), limit: z.number().int().min(1).max(500).optional() }).partial().parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const maxPoints = data.maxPoints ?? 50;
    const limit = data.limit ?? 100;

    const { data: accounts } = await supabaseAdmin
      .from("loyalty_accounts")
      .select("phone_number,points,tier")
      .gt("points", 0)
      .lt("points", maxPoints)
      .limit(limit);

    const list = (accounts ?? []) as Array<{ phone_number: string; points: number; tier: string }>;
    if (list.length === 0) return { queued: 0 };

    const rows: QueueRow[] = list.map((a) => ({
      campaign_kind: "loyalty_reminder",
      customer_phone: a.phone_number,
      segment: `tier_${a.tier}`,
      reason: `low_points_${a.points}`,
      payload: { points: a.points, tier: a.tier },
      message_text: `💎 لديك ${a.points} نقطة ولاء (${a.tier}). تسوّق الآن واربح المزيد قبل انتهاء صلاحيتها!`,
      status: "pending",
    }));

    const { error } = await supabaseAdmin.from("marketing_queue").insert(rows);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("marketing_campaigns").insert({
      name: `تذكير الولاء (<${maxPoints} نقطة)`,
      type: "loyalty_reminder",
      sent_to: rows.length,
      created_by: context.userId,
      metadata: { maxPoints },
    });

    return { queued: rows.length };
  });

export const runRestockAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ productId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id,name,stock_qty")
      .eq("id", data.productId)
      .single();
    if (!product) throw new Error("product_not_found");

    const { data: subs } = await supabaseAdmin
      .from("stock_subscriptions")
      .select("phone_number")
      .eq("product_id", data.productId)
      .eq("active", true);

    const phones = ((subs ?? []) as Array<{ phone_number: string }>).map((s) => s.phone_number);
    if (phones.length === 0) return { queued: 0 };

    const rows: QueueRow[] = phones.map((p) => ({
      campaign_kind: "restock",
      customer_phone: p,
      segment: "stock_watchers",
      reason: `restock_${data.productId}`,
      payload: { productId: product.id, name: product.name, stock: product.stock_qty },
      message_text: `🔔 المنتج "${product.name}" متوفر الآن! اطلبه قبل نفاد الكمية.`,
      status: "pending",
    }));

    const { error } = await supabaseAdmin.from("marketing_queue").insert(rows);
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("stock_subscriptions")
      .update({ active: false, notified_at: new Date().toISOString() })
      .eq("product_id", data.productId)
      .eq("active", true);

    await supabaseAdmin.from("marketing_campaigns").insert({
      name: `تنبيه إعادة توفر: ${product.name}`,
      type: "restock",
      sent_to: rows.length,
      created_by: context.userId,
      metadata: { productId: product.id },
    });

    return { queued: rows.length };
  });

export const listMarketingCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data, error } = await context.supabase
      .from("marketing_campaigns")
      .select("id,name,type,sent_to,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
