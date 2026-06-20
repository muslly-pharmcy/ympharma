import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listInventoryReservations,
  inventoryReservationStats,
  retryReserveOrderStock,
} from "@/lib/inventory-reservations.functions";

export const Route = createFileRoute("/admin-inventory-reservations")({
  head: () => ({ meta: [{ title: "Inventory Reservations — Admin" }] }),
  component: Page,
});

function Page() {
  const [kind, setKind] = useState<"ALL" | "RESERVE_STOCK" | "RELEASE_STOCK">("ALL");
  const [status, setStatus] = useState<"ALL" | "EXECUTED" | "FAILED" | "PENDING_APPROVAL">("ALL");
  const list = useServerFn(listInventoryReservations);
  const stats = useServerFn(inventoryReservationStats);
  const retry = useServerFn(retryReserveOrderStock);
  const qc = useQueryClient();

  const rowsQ = useQuery({
    queryKey: ["inv_reservations", kind, status],
    queryFn: () => list({ data: { kind, status, limit: 100 } }),
    refetchInterval: 20_000,
  });
  const statsQ = useQuery({
    queryKey: ["inv_reservations_stats"],
    queryFn: () => stats(),
    refetchInterval: 30_000,
  });

  const onRetry = async (orderId: string) => {
    await retry({ data: { order_id: orderId } });
    qc.invalidateQueries({ queryKey: ["inv_reservations"] });
    qc.invalidateQueries({ queryKey: ["inv_reservations_stats"] });
  };

  const s = statsQ.data;
  return (
    <div dir="rtl" className="mx-auto max-w-6xl p-4 space-y-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">حلقة المخزون — Reservations</h1>
          <p className="text-sm text-muted-foreground">آخر 7 أيام • تحديث تلقائي</p>
        </div>
        <a href="/admin-automation-hub" className="text-sm underline text-primary">→ Automation Hub</a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card title="حجوزات ناجحة" value={s?.reserved ?? "—"} tone="ok" />
        <Card title="فشل/نقص" value={s?.failed ?? "—"} tone={s && s.failed > 0 ? "warn" : "neutral"} />
        <Card title="إفراجات" value={s?.released ?? "—"} />
        <Card title="أصناف ناقصة" value={s?.shortage_items ?? "—"} tone={s && s.shortage_items > 0 ? "warn" : "neutral"} />
      </section>

      {s && s.low_stock.length > 0 && (
        <section className="rounded-lg border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 p-3">
          <h2 className="text-sm font-semibold mb-2 text-amber-700 dark:text-amber-400">⚠ منتجات تحت سقف 5 وحدات</h2>
          <ul className="text-sm space-y-1">
            {s.low_stock.map((p: any) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="font-mono">stock={p.stock_qty} · reorder@{p.reorder_point ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border p-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm">النوع:</label>
          <select className="border rounded px-2 py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value as never)}>
            <option value="ALL">الكل</option>
            <option value="RESERVE_STOCK">حجز</option>
            <option value="RELEASE_STOCK">إفراج</option>
          </select>
          <label className="text-sm ms-3">الحالة:</label>
          <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as never)}>
            <option value="ALL">الكل</option>
            <option value="EXECUTED">ناجح</option>
            <option value="FAILED">فشل</option>
            <option value="PENDING_APPROVAL">قيد المراجعة</option>
          </select>
          <button className="ms-auto text-xs underline" onClick={() => rowsQ.refetch()}>تحديث</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-right p-2">النوع</th>
                <th className="text-right p-2">الطلب</th>
                <th className="text-right p-2">الحالة</th>
                <th className="text-right p-2">الملخص</th>
                <th className="text-right p-2">الوقت</th>
                <th className="text-right p-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {(rowsQ.data?.rows ?? []).map((r: any) => {
                const orderId = r.payload?.order_id as string | undefined;
                const shortages = r.payload?.result?.shortages ?? [];
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2 font-mono text-xs">{r.action_type}</td>
                    <td className="p-2 text-xs">{orderId ?? "—"}</td>
                    <td className="p-2 text-xs">
                      {r.execution_status === "FAILED" ? (
                        <span className="text-destructive">✗ FAILED</span>
                      ) : r.execution_status === "EXECUTED" ? (
                        <span className="text-emerald-600">✓ EXECUTED</span>
                      ) : (
                        <span className="text-amber-600">⏳ {r.execution_status}</span>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {r.compiled_arabic_output}
                      {shortages.length > 0 && (
                        <div className="text-destructive text-[10px] mt-1">نقص: {shortages.length} صنف</div>
                      )}
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">{new Date(r.executed_at ?? r.created_at).toLocaleString("ar")}</td>
                    <td className="p-2">
                      {orderId && r.execution_status === "FAILED" && (
                        <button onClick={() => onRetry(orderId)} className="text-xs underline text-primary">إعادة محاولة الحجز</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(rowsQ.data?.rows ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">لا حركات.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, tone = "neutral" }: { title: string; value: number | string; tone?: "ok" | "warn" | "neutral" }) {
  const toneCls = tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}
