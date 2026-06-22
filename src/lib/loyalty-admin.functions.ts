// Admin-only loyalty analytics (tier distribution, totals, top members).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" } as never),
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "owner" } as never),
  ]);
  if (!isAdmin && !isOwner) throw new Error("forbidden");
}

export type LoyaltyOverview = {
  totals: {
    accounts: number;
    totalPoints: number;
    totalSpentYer: number;
    linkedToUsers: number;
  };
  tierDistribution: Array<{ tier: string; count: number; totalPoints: number; totalSpent: number }>;
  topMembers: Array<{ phone_number: string; points: number; tier: string; total_spent_yer: number }>;
  recentTransactions: Array<{
    id: string;
    phone_number: string;
    points: number;
    type: string;
    description: string | null;
    created_at: string;
  }>;
};

export const getLoyaltyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LoyaltyOverview> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("loyalty_accounts")
      .select("phone_number, points, tier, total_spent_yer, user_id");
    if (accErr) throw new Error(accErr.message);

    const rows = (accounts ?? []) as Array<{
      phone_number: string;
      points: number;
      tier: string;
      total_spent_yer: number;
      user_id: string | null;
    }>;

    const totals = rows.reduce(
      (acc, r) => {
        acc.accounts += 1;
        acc.totalPoints += Number(r.points || 0);
        acc.totalSpentYer += Number(r.total_spent_yer || 0);
        if (r.user_id) acc.linkedToUsers += 1;
        return acc;
      },
      { accounts: 0, totalPoints: 0, totalSpentYer: 0, linkedToUsers: 0 },
    );

    const tierMap = new Map<string, { count: number; totalPoints: number; totalSpent: number }>();
    for (const t of ["bronze", "silver", "gold", "platinum"]) {
      tierMap.set(t, { count: 0, totalPoints: 0, totalSpent: 0 });
    }
    for (const r of rows) {
      const e = tierMap.get(r.tier) ?? { count: 0, totalPoints: 0, totalSpent: 0 };
      e.count += 1;
      e.totalPoints += Number(r.points || 0);
      e.totalSpent += Number(r.total_spent_yer || 0);
      tierMap.set(r.tier, e);
    }
    const tierDistribution = Array.from(tierMap.entries()).map(([tier, v]) => ({ tier, ...v }));

    const topMembers = [...rows]
      .sort((a, b) => Number(b.points) - Number(a.points))
      .slice(0, 10)
      .map((r) => ({
        phone_number: r.phone_number,
        points: Number(r.points),
        tier: r.tier,
        total_spent_yer: Number(r.total_spent_yer),
      }));

    const { data: tx } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("id, phone_number, points, type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      totals,
      tierDistribution,
      topMembers,
      recentTransactions: (tx ?? []) as LoyaltyOverview["recentTransactions"],
    };
  });
