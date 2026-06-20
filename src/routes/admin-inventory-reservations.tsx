import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listInventoryReservations,
  listInventoryAuditLog,
  inventoryReservationStats,
  retryReserveOrderStock,
  retryReleaseOrderStock,
} from "@/lib/inventory-reservations.functions";

export const Route = createFileRoute("/admin-inventory-reservations")({
  head: () => ({ meta: [{ title: "Inventory Reservations — Admin" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

function Page() {
  const [tab, setTab] = useState<"actions" | "audit">("actions");
  const [kind, setKind] = useState<"ALL" | "RESERVE_STOCK" | "RELEASE_STOCK">("ALL");
  const [status, setStatus] = useState<"ALL" | "EXECUTED" | "FAILED" | "PENDING_APPROVAL">("ALL");
  const [auditAction, setAuditAction] = useState<"ALL" | "RESERVE" | "RELEASE">("ALL");
  const [auditStatus, setAuditStatus] = useState<"ALL" | "OK" | "FAILED" | "SKIPPED_DUPLICATE" | "SHORTAGE">("ALL");
  const [orderId, setOrderId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest_failed">("newest");

  const list = useServerFn(listInventoryReservations);
  const listAudit = useServerFn(listInventoryAuditLog);
  const stats = useServerFn(inventoryReservationStats);
  const retryReserve = useServerFn(retryReserveOrderStock);
  const retryRelease = useServerFn(retryReleaseOrderStock);
  const qc = useQueryClient();

  const filters = {
    order_id: orderId.trim() || undefined,
    from: fromDate ? new Date(fromDate).toISOString() : undefined,
    to: toDate ? new Date(toDate + "T23:59:59").toISOString() : undefined,
    sort,
  };

  const rowsQ = useQuery({
    queryKey: ["inv_reservations", kind, status, filters],
    queryFn: () => list({ data: { kind, status, ...filters, limit: 100 } }),
    refetchInterval: 20_000,
    enabled: tab === "actions",
  });
  const auditQ = useQuery({
    queryKey: ["inv_audit", auditAction, auditStatus, filters],
    queryFn: () => listAudit({ data: { action: auditAction, status: auditStatus, ...filters, limit: 100 } }),
    refetchInterval: 20_000,
    enabled: tab === "audit",
  });
  const statsQ = useQuery({
    queryKey: ["inv_reservations_stats"],
    queryFn: () => stats(),
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inv_reservations"] });
    qc.invalidateQueries({ queryKey: ["inv_audit"] });
    qc.invalidateQueries({ queryKey: ["inv_reservations_stats"] });
  };

  const onRetry = async (orderIdVal: string, type: "reserve" | "release") => {
    const reason = window.prompt("سبب الإجراء (اختياري):", "manual_retry") || undefined;
    try {
      if (type === "reserve") await retryReserve({ data: { order_id: orderIdVal, reason } });
      else await retryRelease({ data: { order_id: orderIdVal, reason } });
      invalidate();
    } catch (e: any) {
      alert(`فشل: ${e?.message ?? e}`);
    }
  };

  const s = statsQ.data;
  return (
    <div dir="rtl" className="mx-auto max-w-6xl p-4 space-y-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">حلقة المخزون — Reservations &amp; Audit</h1>
          <p className="text-sm text-muted-foreground">آخر 7 أيام • تحديث تلقائي • idempotent</p>
        </div>
        <a href="/admin-automation-hub" className="text-sm underline text-primary">→ Automation Hub</a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card title="حجوزات ناجحة" value={s?.reserved ?? "—"} tone="ok" />
        <Card title="فشل/نقص" value={s?.failed ?? "—"} tone={s && s.failed > 0 ? "warn" : "neutral"} />
        <Card title="إفراجات" value={s?.released ?? "—"} />
        <Card title="تكرار محبط (idempotent)" value={s?.audit?.duplicate ?? "—"} />
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

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab("actions")}
          className={`px-3 py-2 text-sm ${tab === "actions" ? "border-b-2 border-primary font-bold" : "text-muted-foreground"}`}>
          سجل الإجراءات (agent_actions)
        </button>
        <button onClick={() => setTab("audit")}
          className={`px-3 py-2 text-sm ${tab === "audit" ? "border-b-2 border-primary font-bold" : "text-muted-foreground"}`}>
          سجل التدقيق (audit log)
        </button>
      </div>

      <section className="rounded-lg border p-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">order_id</label>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="bحث برقم الطلب"
              className="w-full border rounded px-2 py-1 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">من تاريخ</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">إلى تاريخ</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">الفرز</label>
            <select className="w-full border rounded px-2 py-1 text-sm" value={sort} onChange={(e) => setSort(e.target.value as never)}>
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest_failed">أقدم فشل أولاً</option>
            </select>
          </div>
        </div>

        {tab === "actions" ? (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-sm">النوع:</label>
              <select className="border rounded px-2 py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value as never)}>
                <option value="ALL">الكل</option><option value="RESERVE_STOCK">حجز</option><option value="RELEASE_STOCK">إفراج</option>
              </select>
              <label className="text-sm ms-3">الحالة:</label>
              <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as never)}>
                <option value="ALL">الكل</option><option value="EXECUTED">ناجح</option><option value="FAILED">فشل</option>
              </select>
              <button className="ms-auto text-xs underline" onClick={() => rowsQ.refetch()}>تحديث</button>
            </div>
            <ActionsTable rows={rowsQ.data?.rows ?? []} onRetry={onRetry} />
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-sm">الإجراء:</label>
              <select className="border rounded px-2 py-1 text-sm" value={auditAction} onChange={(e) => setAuditAction(e.target.value as never)}>
                <option value="ALL">الكل</option><option value="RESERVE">حجز</option><option value="RELEASE">إفراج</option>
              </select>
              <label className="text-sm ms-3">الحالة:</label>
              <select className="border rounded px-2 py-1 text-sm" value={auditStatus} onChange={(e) => setAuditStatus(e.target.value as never)}>
                <option value="ALL">الكل</option><option value="OK">ناجح</option><option value="FAILED">فشل</option>
                <option value="SHORTAGE">نقص</option><option value="SKIPPED_DUPLICATE">تكرار</option>
              </select>
              <button className="ms-auto text-xs underline" onClick={() => auditQ.refetch()}>تحديث</button>
            </div>
            <AuditTable rows={auditQ.data?.rows ?? []} onRetry={onRetry} />
          </>
        )}
      </section>
    </div>
  );
}

function ActionsTable({ rows, onRetry }: { rows: any[]; onRetry: (id: string, type: "reserve" | "release") => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr><th className="text-right p-2">النوع</th><th className="text-right p-2">الطلب</th><th className="text-right p-2">الحالة</th><th className="text-right p-2">الملخص</th><th className="text-right p-2">الوقت</th><th className="text-right p-2">إجراء</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const oid = r.payload?.order_id as string | undefined;
            const shortages = r.payload?.result?.shortages ?? [];
            return (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 font-mono text-xs">{r.action_type}</td>
                <td className="p-2 text-xs font-mono">{oid ?? "—"}</td>
                <td className="p-2 text-xs">
                  {r.execution_status === "FAILED" ? <span className="text-destructive">✗ FAILED</span>
                    : r.execution_status === "EXECUTED" ? <span className="text-emerald-600">✓ EXECUTED</span>
                    : <span className="text-amber-600">⏳ {r.execution_status}</span>}
                </td>
                <td className="p-2 text-xs">
                  {r.compiled_arabic_output}
                  {shortages.length > 0 && <div className="text-destructive text-[10px] mt-1">نقص: {shortages.length} صنف</div>}
                </td>
                <td className="p-2 text-xs whitespace-nowrap">{new Date(r.executed_at ?? r.created_at).toLocaleString("ar")}</td>
                <td className="p-2 space-x-2 space-x-reverse">
                  {oid && r.execution_status === "FAILED" && (
                    <button onClick={() => onRetry(oid, "reserve")} className="text-xs underline text-primary">إعادة حجز</button>
                  )}
                  {oid && r.action_type === "RESERVE_STOCK" && r.execution_status === "EXECUTED" && (
                    <button onClick={() => onRetry(oid, "release")} className="text-xs underline text-amber-600">إفراج</button>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">لا حركات.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows, onRetry }: { rows: any[]; onRetry: (id: string, type: "reserve" | "release") => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr><th className="text-right p-2">الإجراء</th><th className="text-right p-2">الحالة</th><th className="text-right p-2">الطلب</th><th className="text-right p-2">السبب</th><th className="text-right p-2">المستخدم</th><th className="text-right p-2">الوقت</th><th className="text-right p-2">إجراء</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t align-top">
              <td className="p-2 font-mono text-xs">{r.action}</td>
              <td className="p-2 text-xs">
                {r.status === "OK" && <span className="text-emerald-600">✓ OK</span>}
                {r.status === "FAILED" && <span className="text-destructive">✗ FAILED</span>}
                {r.status === "SHORTAGE" && <span className="text-amber-600">⚠ نقص</span>}
                {r.status === "SKIPPED_DUPLICATE" && <span className="text-muted-foreground">⊘ تكرار</span>}
              </td>
              <td className="p-2 text-xs font-mono">{r.order_id}</td>
              <td className="p-2 text-xs">{r.reason ?? "—"}</td>
              <td className="p-2 text-xs font-mono">{r.actor ? String(r.actor).slice(0, 8) : "system"}</td>
              <td className="p-2 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</td>
              <td className="p-2 space-x-2 space-x-reverse">
                {(r.status === "FAILED" || r.status === "SHORTAGE") && (
                  <button onClick={() => onRetry(r.order_id, r.action === "RELEASE" ? "release" : "reserve")} className="text-xs underline text-primary">إعادة محاولة</button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">لا سجلات.</td></tr>}
        </tbody>
      </table>
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
