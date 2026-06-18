import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runLiveSecurityScan, type Finding } from "@/lib/security-scan.functions";
import { toast } from "sonner";

const CATEGORY_LABEL: Record<string, string> = {
  definer_anon_executable: "دوال SECURITY DEFINER قابلة للاستدعاء من العموم",
  definer_authenticated_executable: "دوال SECURITY DEFINER قابلة للاستدعاء من المسجلين",
  function_search_path_mutable: "دوال بدون search_path ثابت",
  extension_in_public: "إضافات داخل public",
  rls_always_true: "سياسات RLS مفتوحة (WITH CHECK true)",
  table_no_rls: "جدول بدون RLS",
};

const LEVEL_BADGE: Record<string, string> = {
  error: "bg-rose-100 text-rose-700 border-rose-200",
  warn: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-sky-100 text-sky-700 border-sky-200",
};

export function SecurityTab() {
  const scan = useServerFn(runLiveSecurityScan);
  const [data, setData] = useState<Awaited<ReturnType<typeof scan>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "accepted" | "actionable">("all");

  const refresh = async () => {
    setBusy(true);
    try { setData(await scan({})); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo<Finding[]>(() => {
    if (!data) return [];
    return data.findings.filter(f =>
      (!filterCat || f.category === filterCat) &&
      (filterStatus === "all" ||
        (filterStatus === "accepted" && f.accepted) ||
        (filterStatus === "actionable" && !f.accepted))
    );
  }, [data, filterCat, filterStatus]);

  const cats = data ? Object.keys(data.summary.byCategory) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">ملخص الفحص الأمني</h3>
          <button onClick={refresh} disabled={busy} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
            {busy ? "جارٍ الفحص…" : "إعادة الفحص الآن"}
          </button>
        </div>
        {!data && <p className="text-sm text-muted-foreground">جارٍ تحميل النتائج…</p>}
        {data && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="إجمالي" value={data.summary.total} />
            <Stat label="مقبولة عمداً" value={data.summary.accepted} color="text-emerald-700" />
            <Stat label="تحتاج إجراء" value={data.summary.actionable} color={data.summary.actionable ? "text-rose-700" : "text-emerald-700"} />
          </div>
        )}
        {data && (
          <p className="text-xs text-muted-foreground">آخر فحص: {new Date(data.scannedAt).toLocaleString("ar")}</p>
        )}
      </div>

      {data && data.recentlyFixed.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
          <h3 className="text-lg font-black text-emerald-900">تم إصلاحها مؤخراً ✓</h3>
          <ul className="text-sm space-y-1">
            {data.recentlyFixed.map(f => (
              <li key={f.id} className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                <span><span className="font-mono text-xs">{f.id}</span> — {f.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black ml-auto">النتائج المتبقية</h3>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
            <option value="all">الكل</option>
            <option value="actionable">تحتاج إجراء</option>
            <option value="accepted">مقبولة عمداً</option>
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
            <option value="">جميع الأنواع</option>
            {cats.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
          </select>
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد نتائج مطابقة.</p>
        )}

        <ul className="space-y-2">
          {filtered.map((f, i) => (
            <li key={i} className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${LEVEL_BADGE[f.level]}`}>{f.level}</span>
                <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[f.category] ?? f.category}</span>
                {f.accepted && <span className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-bold">مقبولة عمداً</span>}
              </div>
              <div className="text-sm font-bold">{f.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{f.detail}</div>
              {f.accepted && (
                <div className="text-xs text-emerald-800 bg-emerald-50 rounded p-2">السبب: {f.accepted.reason}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
