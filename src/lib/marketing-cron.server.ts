// Server-only logic for scheduled marketing campaigns.
// Called by /api/public/hooks/run-* webhooks (cron). Uses supabaseAdmin
// because cron has no user session. Writes to marketing_queue (status='pending')
// for the existing WhatsApp dispatch pipeline, and logs to marketing_campaigns.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

type QueueRow = {
  campaign_kind: string;
  customer_phone: string;
  segment: string;
  reason: string;
  payload: Json;
  message_text: string;
  status: "pending";
};

export async function runReactivationCron(opts: { days?: number; limit?: number } = {}) {
  const days = opts.days ?? 30;
  const limit = opts.limit ?? 100;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data: inactive } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select("phone_number,last_message_at")
    .lt("last_message_at", cutoff)
    .order("last_message_at", { ascending: true })
    .limit(limit);

  const phones = ((inactive ?? []) as Array<{ phone_number: string }>).map((r) => r.phone_number);
  if (phones.length === 0) {
    await supabaseAdmin.from("marketing_campaigns").insert({
      name: `إعادة تنشيط (${days} يوم) — cron`,
      type: "reactivation",
      sent_to: 0,
      metadata: { days, cutoff, source: "cron" },
    });
    return { queued: 0 };
  }

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
  const message = `👋 مرحباً! اشتقنا لك. عروض خاصة لك:\n${offerText}\n\nاستخدم الكود WELCOME10 لخصم 10%.`;

  const rows: QueueRow[] = phones.map((p) => ({
    campaign_kind: "reactivation",
    customer_phone: p,
    segment: `inactive_${days}d`,
    reason: `no_activity_since_${cutoff}`,
    payload: { offers: offers ?? [], source: "cron" },
    message_text: message,
    status: "pending",
  }));

  const { error } = await supabaseAdmin.from("marketing_queue").insert(rows);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("marketing_campaigns").insert({
    name: `إعادة تنشيط (${days} يوم) — cron`,
    type: "reactivation",
    sent_to: rows.length,
    metadata: { days, cutoff, source: "cron" },
  });

  return { queued: rows.length };
}

export async function runLoyaltyReminderCron(opts: { maxPoints?: number; limit?: number } = {}) {
  const maxPoints = opts.maxPoints ?? 50;
  const limit = opts.limit ?? 200;

  const { data: accounts } = await supabaseAdmin
    .from("loyalty_accounts")
    .select("phone_number,points,tier")
    .gt("points", 0)
    .lt("points", maxPoints)
    .limit(limit);

  const list = (accounts ?? []) as Array<{ phone_number: string; points: number; tier: string }>;
  if (list.length === 0) {
    await supabaseAdmin.from("marketing_campaigns").insert({
      name: `تذكير الولاء — cron`,
      type: "loyalty_reminder",
      sent_to: 0,
      metadata: { maxPoints, source: "cron" },
    });
    return { queued: 0 };
  }

  const rows: QueueRow[] = list.map((a) => ({
    campaign_kind: "loyalty_reminder",
    customer_phone: a.phone_number,
    segment: `tier_${a.tier}`,
    reason: `low_points_${a.points}`,
    payload: { points: a.points, tier: a.tier, source: "cron" },
    message_text: `💎 لديك ${a.points} نقطة ولاء (${a.tier}). تسوّق الآن واربح المزيد!`,
    status: "pending",
  }));

  const { error } = await supabaseAdmin.from("marketing_queue").insert(rows);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("marketing_campaigns").insert({
    name: `تذكير الولاء (<${maxPoints} نقطة) — cron`,
    type: "loyalty_reminder",
    sent_to: rows.length,
    metadata: { maxPoints, source: "cron" },
  });

  return { queued: rows.length };
}

export async function runRestockAlertsCron() {
  // Pull all active subscriptions whose product is back in stock.
  const { data: subs } = await supabaseAdmin
    .from("stock_subscriptions")
    .select("id,phone_number,product_id,products!inner(id,name,stock_qty)")
    .eq("active", true)
    .gt("products.stock_qty", 0);

  type Row = {
    id: string;
    phone_number: string;
    product_id: string;
    products: { id: string; name: string; stock_qty: number } | null;
  };
  const list = (subs ?? []) as unknown as Row[];

  if (list.length === 0) {
    await supabaseAdmin.from("marketing_campaigns").insert({
      name: "تنبيهات إعادة التوفر — cron",
      type: "restock",
      sent_to: 0,
      metadata: { source: "cron" },
    });
    return { queued: 0 };
  }

  const rows: QueueRow[] = list
    .filter((s) => s.products)
    .map((s) => ({
      campaign_kind: "restock",
      customer_phone: s.phone_number,
      segment: "stock_watchers",
      reason: `restock_${s.product_id}`,
      payload: { productId: s.product_id, name: s.products!.name, stock: s.products!.stock_qty, source: "cron" },
      message_text: `🔔 المنتج "${s.products!.name}" متوفر الآن! اطلبه قبل نفاد الكمية.`,
      status: "pending",
    }));

  const { error } = await supabaseAdmin.from("marketing_queue").insert(rows);
  if (error) throw new Error(error.message);

  const ids = list.map((s) => s.id);
  await supabaseAdmin
    .from("stock_subscriptions")
    .update({ active: false, notified_at: new Date().toISOString() })
    .in("id", ids);

  await supabaseAdmin.from("marketing_campaigns").insert({
    name: "تنبيهات إعادة التوفر — cron",
    type: "restock",
    sent_to: rows.length,
    metadata: { source: "cron", productCount: new Set(list.map((s) => s.product_id)).size },
  });

  return { queued: rows.length };
}
