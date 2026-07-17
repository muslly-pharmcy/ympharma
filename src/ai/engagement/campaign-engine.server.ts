import { sendPush } from "./notification-engine.server";

const FREQ_HOURS: Record<string, number> = {
  daily: 24,
  "72_hours": 72,
  weekly: 168,
};

type SubRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_success_at: string | null;
  fail_count: number;
};

type PostRow = {
  id: string;
  title: string;
  summary: string | null;
  slug: string;
};

type CampaignRow = {
  id: string;
  frequency: string;
  active: boolean;
};

export async function dispatchDueCampaigns(): Promise<{
  campaigns: number;
  sent: number;
  failed: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: campaigns } = await supabaseAdmin
    .from("ai_campaigns")
    .select("id, frequency, active")
    .eq("active", true);

  const list: CampaignRow[] = (campaigns as CampaignRow[] | null) ?? [];
  if (list.length === 0) return { campaigns: 0, sent: 0, failed: 0 };

  const { data: postRow } = await supabaseAdmin
    .from("medical_posts")
    .select("id, title, summary, slug")
    .eq("approved", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const post = postRow as PostRow | null;
  if (!post) return { campaigns: list.length, sent: 0, failed: 0 };

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, last_success_at, fail_count")
    .eq("active", true)
    .lt("fail_count", 5)
    .limit(500);

  const subList: SubRow[] = (subs as SubRow[] | null) ?? [];
  if (subList.length === 0) return { campaigns: list.length, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const campaign of list) {
    const hours = FREQ_HOURS[campaign.frequency] ?? 72;
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const { data: recent } = await supabaseAdmin
      .from("campaign_deliveries")
      .select("subscription_id")
      .eq("campaign_id", campaign.id)
      .gt("sent_at", cutoff);

    const excluded = new Set(((recent as { subscription_id: string }[] | null) ?? []).map((r) => r.subscription_id));
    const targets = subList.filter((s) => !excluded.has(s.id));

    for (const sub of targets) {
      const { data: delivery } = await supabaseAdmin
        .from("campaign_deliveries")
        .insert({
          campaign_id: campaign.id,
          subscription_id: sub.id,
          post_id: post.id,
          status: "pending",
        } as never)
        .select("id")
        .maybeSingle();

      const deliveryId = (delivery as { id: string } | null)?.id;
      const result = await sendPush(sub, {
        title: post.title,
        body: post.summary || "نصيحة صحية جديدة من المصلي",
        url: `/health-tips/${post.slug}`,
        tag: post.slug,
        deliveryId,
      });

      if (result.ok) {
        sent++;
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), fail_count: 0 })
          .eq("id", sub.id);
        if (deliveryId) {
          await supabaseAdmin
            .from("campaign_deliveries")
            .update({ status: "sent" })
            .eq("id", deliveryId);
        }
      } else {
        failed++;
        const nextFail = sub.fail_count + 1;
        await supabaseAdmin
          .from("push_subscriptions")
          .update({
            fail_count: nextFail,
            active: nextFail < 5 && result.status !== 410 && result.status !== 404,
          })
          .eq("id", sub.id);
        if (deliveryId) {
          await supabaseAdmin
            .from("campaign_deliveries")
            .update({ status: "failed", error_message: result.error?.slice(0, 500) })
            .eq("id", deliveryId);
        }
      }
    }
  }

  return { campaigns: list.length, sent, failed };
}
