// Invoicing & reporting: HTML invoices, CSV sales export, financial summary.
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

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const generateInvoiceHtml = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ orderId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }): Promise<{ html: string; orderId: string }> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,customer_name,customer_phone,customer_address,items,subtotal,discount_amount,discount_code,total,status,created_at")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("order_not_found");

    const items = Array.isArray(order.items) ? (order.items as Array<{ name?: string; quantity?: number; price?: number }>) : [];
    const rows = items
      .map(
        (it) =>
          `<tr><td>${esc(it.name)}</td><td style="text-align:center">${esc(it.quantity ?? 1)}</td><td style="text-align:left">${esc(it.price ?? 0)} ر.ي</td><td style="text-align:left">${esc(Number(it.price ?? 0) * Number(it.quantity ?? 1))} ر.ي</td></tr>`,
      )
      .join("");

    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>فاتورة ${esc(order.id)}</title><style>
body{font-family:system-ui,Segoe UI,Tahoma,Arial;padding:24px;color:#111}
h1{margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #ddd;padding:8px;font-size:14px}
th{background:#f5f5f5}
.summary{margin-top:16px;font-size:14px}
.summary div{display:flex;justify-content:space-between;padding:4px 0}
.total{font-weight:700;font-size:18px;border-top:2px solid #111;margin-top:8px;padding-top:8px}
</style></head><body>
<h1>صيدلية المصلي</h1>
<div>رقم الفاتورة: <b>${esc(order.id)}</b></div>
<div>التاريخ: ${esc(new Date(order.created_at).toLocaleString("ar-YE"))}</div>
<div>الحالة: ${esc(order.status)}</div>
<hr/>
<div><b>العميل:</b> ${esc(order.customer_name)}</div>
<div><b>الهاتف:</b> ${esc(order.customer_phone)}</div>
${order.customer_address ? `<div><b>العنوان:</b> ${esc(order.customer_address)}</div>` : ""}
<table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
<div class="summary">
  <div><span>المجموع الفرعي</span><span>${esc(order.subtotal ?? order.total)} ر.ي</span></div>
  ${order.discount_amount ? `<div><span>الخصم${order.discount_code ? ` (${esc(order.discount_code)})` : ""}</span><span>- ${esc(order.discount_amount)} ر.ي</span></div>` : ""}
  <div class="total"><span>الإجمالي</span><span>${esc(order.total)} ر.ي</span></div>
</div>
<p style="margin-top:24px;color:#666;font-size:12px">شكراً لتسوقك من صيدلية المصلي. للاستفسار عبر واتساب.</p>
</body></html>`;

    return { html, orderId: order.id as string };
  });

export const exportSalesCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ startDate: z.string().min(10), endDate: z.string().min(10) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<{ csv: string; rows: number; filename: string }> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id,created_at,customer_name,customer_phone,subtotal,discount_amount,total,status")
      .gte("created_at", new Date(data.startDate).toISOString())
      .lte("created_at", new Date(data.endDate + "T23:59:59").toISOString())
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = (orders ?? []) as Array<Record<string, unknown>>;
    const header = ["id", "created_at", "customer_name", "customer_phone", "subtotal", "discount_amount", "total", "status"];
    const escCsv = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      header.join(",") +
      "\n" +
      list.map((r) => header.map((h) => escCsv(r[h])).join(",")).join("\n");

    return { csv, rows: list.length, filename: `sales_${data.startDate}_${data.endDate}.csv` };
  });

export const getFinancialSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ month: z.number().int().min(0).max(11), year: z.number().int().min(2020).max(2100) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const start = new Date(Date.UTC(data.year, data.month, 1)).toISOString();
    const end = new Date(Date.UTC(data.year, data.month + 1, 1)).toISOString();
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("total,discount_amount,status")
      .gte("created_at", start)
      .lt("created_at", end);

    const list = (orders ?? []) as Array<{ total: number | string; discount_amount: number | string | null; status: string }>;
    const gross = list.reduce((s, o) => s + Number(o.total || 0), 0);
    const discount = list.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const cancelled = list.filter((o) => o.status === "cancelled").reduce((s, o) => s + Number(o.total || 0), 0);
    const net = gross - cancelled;

    return {
      month: data.month,
      year: data.year,
      ordersCount: list.length,
      grossSales: Math.round(gross),
      discountsGiven: Math.round(discount),
      cancelledValue: Math.round(cancelled),
      netRevenue: Math.round(net),
      currency: "YER",
    };
  });
