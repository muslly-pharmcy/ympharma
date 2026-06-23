// Decision Engine — Phase 1 of the marketing agent re-architecture.
// Picks a product to promote using weighted-random sampling over five
// normalized signals. Weights are loaded from `public.agent_weights`
// (admin-tunable). All scoring is computed in-process from a small set of
// SQL aggregates to keep latency under ~500ms.
//
// Server-only. Do NOT import from client code.

interface AgentWeights {
  stock_velocity: number;
  profit_margin: number;
  days_since_last_promotion: number;
  seasonal_factor: number;
  interaction_score: number;
}

const DEFAULT_WEIGHTS: AgentWeights = {
  stock_velocity: 0.30,
  profit_margin: 0.25,
  days_since_last_promotion: 0.20,
  seasonal_factor: 0.15,
  interaction_score: 0.10,
};

export interface ScoredProduct {
  id: string;
  legacy_id: number | null;
  name: string;
  price: number | null;
  description: string | null;
  score: number;
  breakdown: Record<keyof AgentWeights, number>;
}

async function loadWeights(): Promise<AgentWeights> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("agent_weights")
      .select("criterion,weight");
    if (error || !data) return DEFAULT_WEIGHTS;
    const out = { ...DEFAULT_WEIGHTS };
    for (const row of data) {
      if (row.criterion in out) {
        (out as any)[row.criterion] = Number(row.weight);
      }
    }
    // Re-normalize in case admin edits sum to !=1
    const sum = Object.values(out).reduce((a, b) => a + b, 0) || 1;
    (Object.keys(out) as (keyof AgentWeights)[]).forEach((k) => (out[k] = out[k] / sum));
    return out;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

function normalize(values: number[]): number[] {
  if (values.length === 0) return values;
  const max = Math.max(...values);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) => (v > 0 ? v / max : 0));
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Pick a product to promote using the multi-criterion weighted engine.
 * Returns null if no candidates exist; callers should fall back gracefully.
 */
export async function pickProductByScore(): Promise<ScoredProduct | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Candidate products (published, in stock, limited pool for perf)
  const { data: products, error: prodErr } = await supabaseAdmin
    .from("products")
    .select("id,legacy_id,name,price,description,supplier_cost,stock_qty,created_at")
    .eq("is_published", true)
    .gt("stock_qty", 0)
    .order("stock_qty", { ascending: false })
    .limit(80);
  if (prodErr || !products || products.length === 0) return null;

  const legacyIds = products
    .map((p) => p.legacy_id)
    .filter((x): x is number => typeof x === "number");
  const productIds = products.map((p) => p.id);

  // 2) Sales velocity — sum qty per legacy_id from orders.items in last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const velocityMap = new Map<number, number>();
  if (legacyIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("items")
      .gte("created_at", since)
      .neq("status", "cancelled")
      .limit(2000);
    for (const r of (rows ?? []) as Array<{ items: unknown }>) {
      const items = Array.isArray(r.items) ? r.items : [];
      for (const it of items as Array<{ id?: number; qty?: number }>) {
        if (typeof it?.id === "number" && legacyIds.includes(it.id)) {
          velocityMap.set(it.id, (velocityMap.get(it.id) ?? 0) + (Number(it.qty) || 1));
        }
      }
    }
  }

  // 3) Days since last promotion — newest social_posts per product_id
  const lastPromoMap = new Map<string, number>(); // days
  const { data: postsRows } = await supabaseAdmin
    .from("social_posts")
    .select("product_id,created_at")
    .in("product_id", productIds)
    .order("created_at", { ascending: false })
    .limit(500);
  for (const row of (postsRows ?? []) as Array<{ product_id: string | null; created_at: string }>) {
    if (!row.product_id) continue;
    if (!lastPromoMap.has(row.product_id)) {
      const days = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / 86400000);
      lastPromoMap.set(row.product_id, days);
    }
  }

  // 4) Interaction score — avg (likes+comments+shares) for last posts of product
  const interactionMap = new Map<string, number>();
  const { data: statsRows } = await supabaseAdmin
    .from("social_post_stats")
    .select("post_id,likes,comments,shares,social_posts!inner(product_id)")
    .in("social_posts.product_id", productIds)
    .limit(300);
  const interactionAgg = new Map<string, { sum: number; n: number }>();
  for (const row of (statsRows ?? []) as any[]) {
    const pid = row.social_posts?.product_id;
    if (!pid) continue;
    const score = (Number(row.likes) || 0) + (Number(row.comments) || 0) * 2 + (Number(row.shares) || 0) * 3;
    const cur = interactionAgg.get(pid) ?? { sum: 0, n: 0 };
    interactionAgg.set(pid, { sum: cur.sum + score, n: cur.n + 1 });
  }
  for (const [pid, agg] of interactionAgg) interactionMap.set(pid, agg.sum / agg.n);

  // 5) Build raw signals per product
  const raws = products.map((p) => {
    const velocity = (p.legacy_id != null ? velocityMap.get(p.legacy_id) : undefined) ?? 0;
    const price = Number(p.price) || 0;
    const cost = Number(p.supplier_cost) || 0;
    const margin = price > 0 && cost > 0 ? Math.max(0, (price - cost) / price) : 0;
    const daysSince = lastPromoMap.get(p.id);
    // Never-promoted products get a high recency score (capped at 30 days)
    const recency = daysSince == null ? 30 : Math.min(daysSince, 30);
    const seasonal = 1.0; // placeholder for phase 4 (admin-tunable seasonal_factor)
    const interaction = interactionMap.get(p.id) ?? 0;
    return { velocity, margin, recency, seasonal, interaction };
  });

  // 6) Normalize each signal column to 0..1
  const nVelocity = normalize(raws.map((r) => r.velocity));
  const nMargin = raws.map((r) => Math.min(1, Math.max(0, r.margin))); // already 0..1
  const nRecency = normalize(raws.map((r) => r.recency));
  const nSeasonal = raws.map((r) => r.seasonal); // 0..1 (default 1)
  const nInteraction = normalize(raws.map((r) => r.interaction));

  // 7) Load weights and compute composite score
  const w = await loadWeights();
  const scored: ScoredProduct[] = products.map((p, i) => {
    const breakdown = {
      stock_velocity: nVelocity[i],
      profit_margin: nMargin[i],
      days_since_last_promotion: nRecency[i],
      seasonal_factor: nSeasonal[i],
      interaction_score: nInteraction[i],
    };
    const score =
      breakdown.stock_velocity * w.stock_velocity +
      breakdown.profit_margin * w.profit_margin +
      breakdown.days_since_last_promotion * w.days_since_last_promotion +
      breakdown.seasonal_factor * w.seasonal_factor +
      breakdown.interaction_score * w.interaction_score;
    return {
      id: p.id,
      legacy_id: p.legacy_id ?? null,
      name: p.name,
      price: p.price ?? null,
      description: p.description ?? null,
      score,
      breakdown,
    };
  });

  // 8) Weighted-random pick (not pure argmax — keeps variety)
  return weightedPick(scored, scored.map((s) => s.score + 0.01));
}
