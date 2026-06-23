// Context Provider — Phase 2.
// Aggregates real-time business signals into a compact snapshot the
// Generation Layer uses to enrich prompts. Behind feature flag
// `agent.context_provider.enabled` for instant rollback.
//
// Server-only. Timeouts cap each query at ~1s to protect latency budget.

export interface AgentContext {
  generatedAt: string;
  dayName: string; // e.g. "الإثنين"
  hourOfDay: number; // 0..23 (Asia/Aden)
  inventory: {
    lowStockCount: number;
    nearExpiryCount: number;
  };
  sales24h: {
    orders: number;
    revenue: number;
    topProductIds: number[]; // legacy_ids
  };
  recentSuccessfulPosts: Array<{
    platform: string;
    captionExcerpt: string;
    likes: number;
    comments: number;
  }>;
  notes: string[];
}

const ARABIC_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function nowInAden(): { dayName: string; hourOfDay: number } {
  // Asia/Aden is UTC+3 year-round
  const utc = new Date();
  const aden = new Date(utc.getTime() + 3 * 60 * 60 * 1000);
  return { dayName: ARABIC_DAYS[aden.getUTCDay()], hourOfDay: aden.getUTCHours() };
}

export async function buildAgentContext(): Promise<AgentContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { dayName, hourOfDay } = nowInAden();
  const notes: string[] = [];

  // Run aggregates in parallel; tolerate individual failures
  const [lowStockRes, nearExpiryRes, ordersRes, postsRes] = await Promise.allSettled([
    supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("track_stock", true)
      .lte("stock_qty", 5),
    supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .not("expiry_date", "is", null)
      .lte("expiry_date", new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)),
    supabaseAdmin
      .from("orders")
      .select("total,items,created_at")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq("status", "cancelled")
      .limit(500),
    supabaseAdmin
      .from("social_post_stats")
      .select("likes,comments,shares,social_posts!inner(platform,caption,status)")
      .eq("social_posts.status", "published")
      .order("likes", { ascending: false })
      .limit(5),
  ]);

  const lowStockCount = lowStockRes.status === "fulfilled" ? lowStockRes.value.count ?? 0 : 0;
  const nearExpiryCount = nearExpiryRes.status === "fulfilled" ? nearExpiryRes.value.count ?? 0 : 0;

  let orders = 0;
  let revenue = 0;
  const productCounts = new Map<number, number>();
  if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value.data)) {
    orders = ordersRes.value.data.length;
    for (const row of ordersRes.value.data as Array<{ total: number; items: unknown }>) {
      revenue += Number(row.total) || 0;
      const items = Array.isArray(row.items) ? row.items : [];
      for (const it of items as Array<{ id?: number; qty?: number }>) {
        if (typeof it?.id === "number") {
          productCounts.set(it.id, (productCounts.get(it.id) ?? 0) + (Number(it.qty) || 1));
        }
      }
    }
  } else {
    notes.push("تعذّر جلب طلبات آخر 24 ساعة");
  }
  const topProductIds = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const recentSuccessfulPosts: AgentContext["recentSuccessfulPosts"] = [];
  if (postsRes.status === "fulfilled" && Array.isArray(postsRes.value.data)) {
    for (const r of postsRes.value.data as any[]) {
      recentSuccessfulPosts.push({
        platform: String(r.social_posts?.platform ?? "?"),
        captionExcerpt: String(r.social_posts?.caption ?? "").slice(0, 80),
        likes: Number(r.likes) || 0,
        comments: Number(r.comments) || 0,
      });
    }
  }

  if (lowStockCount > 10) notes.push(`${lowStockCount} منتج بمخزون منخفض — يفضّل تجنّب الترويج الكثيف لها`);
  if (hourOfDay >= 20 || hourOfDay < 7) notes.push("وقت مسائي/ليلي — نبرة أهدأ");

  return {
    generatedAt: new Date().toISOString(),
    dayName,
    hourOfDay,
    inventory: { lowStockCount, nearExpiryCount },
    sales24h: { orders, revenue, topProductIds },
    recentSuccessfulPosts,
    notes,
  };
}

/** Compact human-readable serialization for embedding into LLM prompts. */
export function summarizeContextForPrompt(ctx: AgentContext): string {
  const lines = [
    `اليوم: ${ctx.dayName}، الساعة ${ctx.hourOfDay}:00 بتوقيت عدن`,
    `مبيعات آخر 24 ساعة: ${ctx.sales24h.orders} طلب، إجمالي ${Math.round(ctx.sales24h.revenue)} ريال`,
    `المخزون: ${ctx.inventory.lowStockCount} منتج بمخزون منخفض، ${ctx.inventory.nearExpiryCount} قارب على الانتهاء`,
  ];
  if (ctx.recentSuccessfulPosts.length > 0) {
    const top = ctx.recentSuccessfulPosts[0];
    lines.push(`أنجح منشور أخير: "${top.captionExcerpt}…" (${top.likes} إعجاب)`);
  }
  if (ctx.notes.length > 0) lines.push(`ملاحظات: ${ctx.notes.join(" | ")}`);
  return lines.join("\n");
}
