// Admin UI for the inventory-transfer workflow (Phase 3 — Transfer Engine).
// REQUESTED → APPROVED → RESERVED → PICKING → PACKED → DISPATCHED →
//   IN_TRANSIT → RECEIVED → COMPLETED  (plus CANCEL / REJECT)
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, ArrowRight, X, CheckCircle2, XCircle, PackageCheck,
  Truck, ClipboardCheck, ArchiveRestore, Boxes, ChevronRight, ChevronLeft,
  Clock, Activity, CheckCheck, AlertTriangle,
} from "lucide-react";
import { listBranches } from "@/lib/branches.functions";
import {
  listTransfers, transferDashboardMetrics, getTransfer, createTransfer,
  approveTransfer, reserveTransfer, markPicking, markPacked,
  markDispatched, markInTransit, markReceived, completeTransfer,
  cancelTransfer, rejectTransfer,
} from "@/lib/transfers.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-transfers")({
  head: () => ({ meta: [
    { title: "تحويلات المخزون — الإدارة" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: () => (<AdminGate><AdminTransfers /></AdminGate>),
});

type Status =
  | "REQUESTED"|"APPROVED"|"RESERVED"|"PICKING"|"PACKED"
  | "DISPATCHED"|"IN_TRANSIT"|"RECEIVED"|"COMPLETED"
  | "CANCELLED"|"REJECTED";

type TransferRow = {
  id: string; correlation_id: string;
  transfer_type: "WH_TO_BRANCH"|"BRANCH_TO_BRANCH"|"BRANCH_TO_WH";
  status: Status;
  source_branch_id: string | null;
  destination_branch_id: string | null;
  reason: string | null; created_at: string;
};

type Branch = { id: string; code: string; name: string; type: string };

const STATUS_AR: Record<Status, string> = {
  REQUESTED: "مطلوب", APPROVED: "معتمد", RESERVED: "محجوز", PICKING: "تجهيز",
  PACKED: "معبأ", DISPATCHED: "أُرسل", IN_TRANSIT: "في الطريق",
  RECEIVED: "استُلم", COMPLETED: "مكتمل", CANCELLED: "ملغى", REJECTED: "مرفوض",
};
const STATUS_COLOR: Record<Status, string> = {
  REQUESTED: "bg-amber-100 text-amber-900",
  APPROVED:  "bg-blue-100 text-blue-900",
  RESERVED:  "bg-indigo-100 text-indigo-900",
  PICKING:   "bg-purple-100 text-purple-900",
  PACKED:    "bg-fuchsia-100 text-fuchsia-900",
  DISPATCHED:"bg-cyan-100 text-cyan-900",
  IN_TRANSIT:"bg-sky-100 text-sky-900",
  RECEIVED:  "bg-emerald-100 text-emerald-900",
  COMPLETED: "bg-green-200 text-green-900",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  REJECTED:  "bg-red-100 text-red-900",
};
const TYPE_AR: Record<TransferRow["transfer_type"], string> = {
  WH_TO_BRANCH: "مستودع → فرع",
  BRANCH_TO_BRANCH: "فرع → فرع",
  BRANCH_TO_WH: "فرع → مستودع",
};

const PAGE_SIZE = 25;

function AdminTransfers() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status | "">("");
  const [typeFilter, setTypeFilter] = useState<TransferRow["transfer_type"] | "">("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [destFilter, setDestFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useServerFn(listTransfers);
  const loadBranches = useServerFn(listBranches);
  const loadMetrics = useServerFn(transferDashboardMetrics);

  // reset to page 0 whenever filters change
  useEffect(() => { setPage(0); }, [status, typeFilter, sourceFilter, destFilter, search]);

  const branchesQ = useQuery({
    queryKey: ["branches", "active"],
    queryFn: () => loadBranches({ data: { includeInactive: false } }),
    staleTime: 60_000,
  });
  const branches = (branchesQ.data ?? []) as Branch[];

  const metricsQ = useQuery({
    queryKey: ["transfers", "metrics"],
    queryFn: () => loadMetrics({ data: {} }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const listQ = useQuery({
    queryKey: ["transfers", "list", { status, typeFilter, sourceFilter, destFilter, search, page }],
    queryFn: () => load({ data: {
      status: status || undefined,
      transfer_type: typeFilter || undefined,
      source_branch_id: sourceFilter || undefined,
      destination_branch_id: destFilter || undefined,
      correlation_search: search.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    } }),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const rows = (listQ.data?.rows ?? []) as TransferRow[];
  const total = listQ.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const branchMap = useMemo(() => {
    const m = new Map<string, Branch>();
    branches.forEach((b) => m.set(b.id, b));
    return m;
  }, [branches]);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["transfers"] });
  }

  const m = metricsQ.data ?? { pending: 0, in_transit: 0, completed: 0, failed: 0 };
  const kpis = [
    { label: "قيد المعالجة", value: m.pending,    Icon: Clock,          color: "text-amber-700"  },
    { label: "في الطريق",     value: m.in_transit, Icon: Activity,       color: "text-sky-700"    },
    { label: "مكتملة",        value: m.completed,  Icon: CheckCheck,     color: "text-emerald-700"},
    { label: "فاشلة/ملغاة",   value: m.failed,     Icon: AlertTriangle,  color: "text-red-700"    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary">
              <ArrowRight className="inline size-4 rotate-180" /> لوحة الإدارة
            </Link>
            <h1 className="text-xl font-bold">تحويلات المخزون</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin-branches" className="text-sm text-primary underline">الفروع</Link>
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              <Plus className="size-4" /> تحويل جديد
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 py-6">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <k.Icon className={`size-4 ${k.color}`} />
              </div>
              <div className="mt-1 text-2xl font-bold">{k.value.toLocaleString("ar-EG")}</div>
            </div>
          ))}
        </div>

        {/* Filters — server-side */}
        <div className="grid grid-cols-2 gap-2 rounded border bg-card p-3 text-sm md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">الحالة</label>
            <select className="w-full rounded border bg-background p-1" value={status}
              onChange={(e) => setStatus(e.target.value as Status | "")}>
              <option value="">الكل</option>
              {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">النوع</label>
            <select className="w-full rounded border bg-background p-1" value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}>
              <option value="">الكل</option>
              {Object.entries(TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">المصدر</label>
            <select className="w-full rounded border bg-background p-1" value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">الكل</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">الوجهة</label>
            <select className="w-full rounded border bg-background p-1" value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}>
              <option value="">الكل</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">بحث المرجع</label>
            <input className="w-full rounded border bg-background p-1" placeholder="TR-…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {listQ.isFetching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
          </div>
        )}

        <div className="overflow-x-auto rounded border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-right">
              <tr>
                <th className="p-2">المرجع</th>
                <th className="p-2">النوع</th>
                <th className="p-2">المصدر</th>
                <th className="p-2">الوجهة</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">التاريخ</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{t.correlation_id}</td>
                  <td className="p-2">{TYPE_AR[t.transfer_type]}</td>
                  <td className="p-2">{t.source_branch_id ? branchMap.get(t.source_branch_id)?.code ?? "—" : "—"}</td>
                  <td className="p-2">{t.destination_branch_id ? branchMap.get(t.destination_branch_id)?.code ?? "—" : "—"}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[t.status]}`}>{STATUS_AR[t.status]}</span></td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar-EG")}</td>
                  <td className="p-2 text-left">
                    <button onClick={() => setOpenId(t.id)} className="text-primary underline">فتح</button>
                  </td>
                </tr>
              ))}
              {!listQ.isFetching && rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد تحويلات.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {total > 0
              ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} من ${total.toLocaleString("ar-EG")}`
              : "—"}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex items-center gap-1 rounded border px-2 py-1 disabled:opacity-40">
              <ChevronRight className="size-4" /> السابق
            </button>
            <span className="px-2">صفحة {page + 1} / {totalPages}</span>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded border px-2 py-1 disabled:opacity-40">
              التالي <ChevronLeft className="size-4" />
            </button>
          </div>
        </div>
      </main>

      {creating && (
        <CreateTransferDialog
          branches={branches}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); invalidateAll(); }}
        />
      )}
      {openId && (
        <TransferDetailDialog
          id={openId}
          branchMap={branchMap}
          onClose={() => setOpenId(null)}
          onChanged={() => refresh()}
        />
      )}
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────

function CreateTransferDialog({
  branches, onClose, onCreated,
}: { branches: Branch[]; onClose: () => void; onCreated: () => void }) {
  const create = useServerFn(createTransfer);
  const [type, setType] = useState<TransferRow["transfer_type"]>("WH_TO_BRANCH");
  const [source, setSource] = useState<string>("");
  const [dest, setDest] = useState<string>("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<Array<{ product_id: string; qty_requested: number; name?: string }>>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!search || search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products").select("id,name").ilike("name", `%${search}%`).limit(8);
      if (active) setResults((data ?? []) as any);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [search]);

  async function submit() {
    if (!source || !dest) { toast.error("اختر المصدر والوجهة"); return; }
    if (items.length === 0) { toast.error("أضف صنفاً واحداً على الأقل"); return; }
    setBusy(true);
    try {
      const r = await create({ data: {
        transfer_type: type, source_branch_id: source, destination_branch_id: dest,
        reason: reason || undefined,
        items: items.map((i) => ({ product_id: i.product_id, qty_requested: i.qty_requested })),
      } });
      toast.success(`تم إنشاء التحويل ${r.correlation_id}`);
      onCreated();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">تحويل جديد</h2>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">نوع التحويل</label>
            <select className="w-full rounded border bg-background p-2" value={type}
              onChange={(e) => setType(e.target.value as any)}>
              <option value="WH_TO_BRANCH">مستودع → فرع</option>
              <option value="BRANCH_TO_BRANCH">فرع → فرع</option>
              <option value="BRANCH_TO_WH">فرع → مستودع</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm">المصدر</label>
              <select className="w-full rounded border bg-background p-2" value={source}
                onChange={(e) => setSource(e.target.value)}>
                <option value="">—</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">الوجهة</label>
              <select className="w-full rounded border bg-background p-2" value={dest}
                onChange={(e) => setDest(e.target.value)}>
                <option value="">—</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">السبب (اختياري)</label>
            <input className="w-full rounded border bg-background p-2" value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="rounded border p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">الأصناف</span>
              <Boxes className="size-4 text-muted-foreground" />
            </div>
            <input className="mb-2 w-full rounded border bg-background p-2 text-sm"
              placeholder="ابحث عن منتج…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
            {results.length > 0 && (
              <div className="mb-2 max-h-40 overflow-y-auto rounded border">
                {results.map((p) => (
                  <button key={p.id} type="button"
                    onClick={() => {
                      if (items.find((i) => i.product_id === p.id)) return;
                      setItems([...items, { product_id: p.id, qty_requested: 1, name: p.name }]);
                      setSearch(""); setResults([]);
                    }}
                    className="block w-full px-2 py-1 text-right text-sm hover:bg-muted">
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <ul className="space-y-1">
              {items.map((i, idx) => (
                <li key={i.product_id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{i.name ?? i.product_id}</span>
                  <input type="number" min={1} className="w-20 rounded border bg-background p-1"
                    value={i.qty_requested}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value || "1", 10));
                      setItems(items.map((it, j) => (j === idx ? { ...it, qty_requested: v } : it)));
                    }} />
                  <button onClick={() => setItems(items.filter((_, j) => j !== idx))}>
                    <X className="size-4 text-destructive" />
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="text-xs text-muted-foreground">لم تُضف أصناف بعد.</li>}
            </ul>
          </div>

          <button disabled={busy} onClick={submit}
            className="flex w-full items-center justify-center gap-1 rounded bg-primary py-2 text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            إنشاء التحويل
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail / action dialog ───────────────────────────────────────────

type Detail = {
  transfer: TransferRow & { notes?: string | null };
  items: Array<{ id: string; product_id: string; qty_requested: number;
    qty_picked: number; qty_received: number; products: { name: string } }>;
  audit: Array<{ id: string; from_status: Status | null; to_status: Status;
    reason: string | null; created_at: string }>;
};

function TransferDetailDialog({
  id, branchMap, onClose, onChanged,
}: { id: string; branchMap: Map<string, Branch>; onClose: () => void; onChanged: () => void }) {
  const get = useServerFn(getTransfer);
  const [d, setD] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [recv, setRecv] = useState<Record<string, number>>({});

  const fns = {
    approve:    useServerFn(approveTransfer),
    reserve:    useServerFn(reserveTransfer),
    picking:    useServerFn(markPicking),
    packed:     useServerFn(markPacked),
    dispatched: useServerFn(markDispatched),
    in_transit: useServerFn(markInTransit),
    received:   useServerFn(markReceived),
    complete:   useServerFn(completeTransfer),
    cancel:     useServerFn(cancelTransfer),
    reject:     useServerFn(rejectTransfer),
  };

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const r = await get({ data: { id } });
      setD(r as Detail);
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [get, id]);

  useEffect(() => { refresh(); }, [refresh]);

  async function act(fn: (a: any) => Promise<any>, args: any = { data: { id } }, label = "تم") {
    setBusy(true);
    try {
      const r = await fn(args);
      const msg = r?.duplicate ? "تم تجاهل التكرار (SKIPPED_DUPLICATE)" : label;
      toast.success(msg);
      await refresh();
      onChanged();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  const status = d?.transfer.status;
  const actions: Array<{ key: string; label: string; Icon: any; run: () => void; danger?: boolean }> = [];
  if (status === "REQUESTED") {
    actions.push({ key: "approve", label: "اعتماد", Icon: CheckCircle2, run: () => act(fns.approve, { data: { id } }, "تم الاعتماد") });
    actions.push({ key: "reject",  label: "رفض",   Icon: XCircle, run: () => act(fns.reject,  { data: { id } }, "تم الرفض"), danger: true });
  }
  if (status === "APPROVED")  actions.push({ key: "reserve", label: "حجز المخزون", Icon: PackageCheck, run: () => act(fns.reserve, { data: { id } }, "تم الحجز") });
  if (status === "RESERVED")  actions.push({ key: "picking", label: "بدء التجهيز", Icon: ClipboardCheck, run: () => act(fns.picking, { data: { id } }, "بدء التجهيز") });
  if (status === "PICKING")   actions.push({ key: "packed",  label: "تم التعبئة",  Icon: PackageCheck, run: () => act(fns.packed,  { data: { id } }, "تم التعبئة") });
  if (status === "PACKED")    actions.push({ key: "dispatched", label: "إرسال",   Icon: Truck, run: () => act(fns.dispatched, { data: { id } }, "تم الإرسال") });
  if (status === "DISPATCHED")actions.push({ key: "in_transit", label: "في الطريق", Icon: Truck, run: () => act(fns.in_transit, { data: { id } }, "تم التحديث") });
  if (status === "IN_TRANSIT")actions.push({
    key: "received", label: "تأكيد الاستلام", Icon: ArchiveRestore,
    run: () => act(fns.received, { data: { id, items: Object.entries(recv).map(([item_id, qty_received]) => ({ item_id, qty_received })) } }, "تم الاستلام"),
  });
  if (status === "RECEIVED")  actions.push({ key: "complete", label: "ترحيل المخزون", Icon: CheckCircle2, run: () => act(fns.complete, { data: { id } }, "اكتمل التحويل") });
  if (status && !["COMPLETED","CANCELLED","REJECTED"].includes(status)) {
    actions.push({ key: "cancel", label: "إلغاء", Icon: X, run: () => act(fns.cancel, { data: { id } }, "تم الإلغاء"), danger: true });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">تفاصيل التحويل</h2>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>

        {busy && !d && <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> جارٍ التحميل…</div>}

        {d && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">المرجع:</span> <span className="font-mono">{d.transfer.correlation_id}</span></div>
              <div><span className="text-muted-foreground">النوع:</span> {TYPE_AR[d.transfer.transfer_type]}</div>
              <div><span className="text-muted-foreground">المصدر:</span> {d.transfer.source_branch_id ? branchMap.get(d.transfer.source_branch_id)?.code : "—"}</div>
              <div><span className="text-muted-foreground">الوجهة:</span> {d.transfer.destination_branch_id ? branchMap.get(d.transfer.destination_branch_id)?.code : "—"}</div>
              <div className="col-span-2">
                <span className="text-muted-foreground">الحالة:</span>{" "}
                <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[d.transfer.status]}`}>{STATUS_AR[d.transfer.status]}</span>
              </div>
              {d.transfer.reason && <div className="col-span-2"><span className="text-muted-foreground">السبب:</span> {d.transfer.reason}</div>}
            </div>

            <div className="rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-right">
                  <tr>
                    <th className="p-2">الصنف</th>
                    <th className="p-2">مطلوب</th>
                    <th className="p-2">مستلم</th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{it.products?.name ?? it.product_id}</td>
                      <td className="p-2">{it.qty_requested}</td>
                      <td className="p-2">
                        {status === "IN_TRANSIT" ? (
                          <input type="number" min={0} max={it.qty_requested}
                            className="w-20 rounded border bg-background p-1"
                            defaultValue={it.qty_received || it.qty_requested}
                            onChange={(e) => setRecv({ ...recv, [it.id]: parseInt(e.target.value || "0", 10) })} />
                        ) : it.qty_received}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <button key={a.key} disabled={busy} onClick={a.run}
                    className={`flex items-center gap-1 rounded px-3 py-1.5 text-sm disabled:opacity-50 ${
                      a.danger ? "bg-destructive text-destructive-foreground"
                               : "bg-primary text-primary-foreground"}`}>
                    <a.Icon className="size-4" /> {a.label}
                  </button>
                ))}
              </div>
            )}

            <div>
              <h3 className="mb-1 text-sm font-semibold">سجل التدقيق</h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {d.audit.map((a) => (
                  <li key={a.id}>
                    {new Date(a.created_at).toLocaleString("ar-EG")} ·{" "}
                    {a.from_status ? `${STATUS_AR[a.from_status]} → ` : ""}{STATUS_AR[a.to_status]}
                    {a.reason && ` — ${a.reason}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
