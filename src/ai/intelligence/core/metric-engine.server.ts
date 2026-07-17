/**
 * MetricEngine — pulls high-level KPIs from real Phoenix tables.
 * Server-only. Uses supabaseAdmin (admin reads, no user session).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export interface SalesMetrics {
  orders_30d: number;
  revenue_30d: number;
  orders_7d: number;
  revenue_7d: number;
  growth_pct: number; // 7d vs previous 7d, percent
}

export interface InventoryMetrics {
  active_products: number;
  low_stock: number;
  expiring_90d: number;
}

export interface FinanceMetrics {
  invoices_30d: number;
  invoice_total_30d: number;
}

export class MetricEngine {
  constructor(private supabase: Admin) {}

  async salesMetrics(): Promise<SalesMetrics> {
    const now = Date.now();
    const d30 = new Date(now - 30 * 86_400_000).toISOString();
    const d7 = new Date(now - 7 * 86_400_000).toISOString();
    const d14 = new Date(now - 14 * 86_400_000).toISOString();

    const [r30, r7, rPrev] = await Promise.all([
      this.supabase.from("orders").select("total_amount, created_at").gte("created_at", d30),
      this.supabase.from("orders").select("total_amount").gte("created_at", d7),
      this.supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", d14)
        .lt("created_at", d7),
    ]);

    const sum = (rows: Array<{ total_amount: number | null }> | null) =>
      (rows ?? []).reduce((a, r) => a + Number(r.total_amount ?? 0), 0);

    const rev7 = sum(r7.data);
    const revPrev = sum(rPrev.data);
    const growth = revPrev > 0 ? ((rev7 - revPrev) / revPrev) * 100 : 0;

    return {
      orders_30d: r30.data?.length ?? 0,
      revenue_30d: sum(r30.data),
      orders_7d: r7.data?.length ?? 0,
      revenue_7d: rev7,
      growth_pct: Math.round(growth * 10) / 10,
    };
  }

  async inventoryMetrics(): Promise<InventoryMetrics> {
    const d90 = new Date(Date.now() + 90 * 86_400_000).toISOString();
    const [prods, alerts, expiring] = await Promise.all([
      this.supabase.from("catalog_products").select("id", { count: "exact", head: true }),
      this.supabase
        .from("inventory_alerts")
        .select("id", { count: "exact", head: true }),
      this.supabase
        .from("inv_stock_batches")
        .select("id", { count: "exact", head: true })
        .lte("expiry_date", d90),
    ]);
    return {
      active_products: prods.count ?? 0,
      low_stock: alerts.count ?? 0,
      expiring_90d: expiring.count ?? 0,
    };
  }

  async financeMetrics(): Promise<FinanceMetrics> {
    const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await this.supabase
      .from("invoices")
      .select("total_amount")
      .gte("created_at", d30);
    const total = (data ?? []).reduce(
      (a: number, r: { total_amount: number | null }) => a + Number(r.total_amount ?? 0),
      0,
    );
    return {
      invoices_30d: data?.length ?? 0,
      invoice_total_30d: total,
    };
  }
}
