// Admin-only executive dashboard — stats, weekly sales, low-stock, pending approvals.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" } as never),
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "owner" } as never),
  ]);
  if (!isAdmin && !isOwner) throw new Error("forbidden");
}

export type DashboardStats = {
  ordersTotal: number;
  ordersLast30: number;
  revenueLast30: number;
  pendingApprovals: number;
  lowStockCount: number;
  activeCustomers30d: number;
  prescriptionsTotal: number;
};

export type WeeklySalesPoint = { day: string; sales: number; orders: number };

export type LowStockProduct = { id: string; name: string; stock_qty: number; reorder_point: number | null };

import type { Json } from "@/integrations/supabase/types";

export type PendingApproval = {
  id: string;
  user_phone: string;
  action_type: string;
  customer_message: string | null;
  created_at: string;
  payload: Json;
};

export type ExecutiveDashboard = {
  stats: DashboardStats;
  weeklySales: WeeklySalesPoint[];
  lowStock: LowStockProduct[];
  pendingApprovals: PendingApproval[];
};

export const getExecutiveDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExecutiveDashboard> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      ordersTotalRes,
      pendingRes,
      lowStockCountRes,
      activeRes,
      ordersRecentRes,
      lowStockRes,
      pendingListRes,
      prescriptionsRes,
    ] = await Promise.all([
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("agent_approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }).lt("stock_qty", 10),
      supabaseAdmin
        .from("whatsapp_conversations")
        .select("phone_number", { count: "exact", head: true })
        .gte("last_message_at", since30),
      supabaseAdmin.from("orders").select("created_at,total").gte("created_at", since30),
      supabaseAdmin
        .from("products")
        .select("id,name,stock_qty,reorder_point")
        .lt("stock_qty", 10)
        .order("stock_qty", { ascending: true })
        .limit(10),
      supabaseAdmin
        .from("agent_approval_requests")
        .select("id,user_phone,action_type,customer_message,created_at,payload")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(10),
      supabaseAdmin.from("prescriptions").select("id", { count: "exact", head: true }),
    ]);

    const recent = (ordersRecentRes.data ?? []) as Array<{ created_at: string; total: number | string }>;
    const revenueLast30 = recent.reduce((s, r) => s + Number(r.total || 0), 0);

    // Weekly aggregate (last 7 days)
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const buckets = new Map<string, { sales: number; orders: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { sales: 0, orders: 0 });
    }
    for (const r of recent) {
      const key = r.created_at.slice(0, 10);
      if (r.created_at >= since7 && buckets.has(key)) {
        const b = buckets.get(key)!;
        b.sales += Number(r.total || 0);
        b.orders += 1;
      }
    }
    const weeklySales: WeeklySalesPoint[] = Array.from(buckets.entries()).map(([key, v]) => ({
      day: dayNames[new Date(key).getDay()],
      sales: Math.round(v.sales),
      orders: v.orders,
    }));

    return {
      stats: {
        ordersTotal: ordersTotalRes.count ?? 0,
        ordersLast30: recent.length,
        revenueLast30: Math.round(revenueLast30),
        pendingApprovals: pendingRes.count ?? 0,
        lowStockCount: lowStockCountRes.count ?? 0,
        activeCustomers30d: activeRes.count ?? 0,
        prescriptionsTotal: prescriptionsRes.count ?? 0,
      },
      weeklySales,
      lowStock: (lowStockRes.data ?? []) as LowStockProduct[],
      pendingApprovals: (pendingListRes.data ?? []) as PendingApproval[],
    };
  });
