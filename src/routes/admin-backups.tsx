import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Download, Loader2, Trash2, Plus, ArrowRight } from "lucide-react";
import { createAndDownloadBackup, downloadJSON } from "@/lib/backup";

export const Route = createFileRoute("/admin-backups")({
  head: () => ({ meta: [{ title: "النسخ الاحتياطية — لوحة التحكم" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: BackupsPage,
});

type Row = { id: string; created_at: string; kind: string; orders_count: number; rx_count: number };

function BackupsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("backups")
      .select("id, created_at, kind, orders_count, rx_count")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function makeNow() {
    setBusy(true);
    try {
      await createAndDownloadBackup("manual");
      toast.success("تم إنشاء نسخة احتياطية وتنزيلها");
      await load();
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  async function downloadOne(id: string) {
    const { data, error } = await supabase
      .from("backups").select("kind, created_at, payload").eq("id", id).maybeSingle();
    if (error || !data) return toast.error("تعذر التنزيل");
    downloadJSON(`backup-${data.kind}-${new Date(data.created_at).toISOString().slice(0,10)}.json`, data.payload);
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه النسخة نهائياً؟")) return;
    const { error } = await supabase.from("backups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((p) => p.filter((r) => r.id !== id));
    toast.success("تم الحذف");
  }

  const labelFor = (k: string) => k === "daily" ? "يومية تلقائية" : k === "weekly" ? "أسبوعية تلقائية" : "يدوية";
  const colorFor = (k: string) => k === "daily" ? "bg-blue-100 text-blue-700" : k === "weekly" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="brand-gradient grid size-10 place-items-center rounded-xl text-primary-foreground"><Database className="size-5" /></div>
            <div>
              <h1 className="text-base font-black">النسخ الاحتياطية</h1>
              <p className="text-[11px] text-muted-foreground">يومية ٢ صباحاً · أسبوعية الأحد ٣ صباحاً · يدوي عند الطلب</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin" className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent"><ArrowRight className="size-3.5" /> رجوع</a>
            <button onClick={makeNow} disabled={busy} className="brand-gradient flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground shadow-card disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              نسخة الآن (JSON)
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-2 px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
            لا توجد نسخ احتياطية بعد. اضغط "نسخة الآن" لإنشاء أول نسخة.
          </div>
        ) : rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${colorFor(r.kind)}`}>{labelFor(r.kind)}</span>
                <span className="text-sm font-bold">{new Date(r.created_at).toLocaleString("ar-EG")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.orders_count} طلب · {r.rx_count} روشتة</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadOne(r.id)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"><Download className="size-3.5" /> تنزيل</button>
              <button onClick={() => remove(r.id)} className="grid size-9 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
