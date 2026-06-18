import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, Save, Plus, X, ImageOff, CheckCircle2, XCircle,
  Download, AlertTriangle, FlaskConical, Images, PlayCircle,
} from "lucide-react";
import {
  listImgProxyLogs,
  getImgProxySettings,
  updateImgProxySettings,
} from "@/lib/img-proxy-admin.functions";
import {
  bulkLookupProductImages,
  listImageOverrideStats,
  lookupProductImage,
} from "@/lib/product-images.functions";
import { useMergedProducts } from "@/lib/use-merged-products";
import { productDedupeKey } from "@/lib/use-merged-products";

type LogRow = {
  id: number;
  created_at: string;
  host: string | null;
  url: string;
  status: number;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
};

const FAILURE_THRESHOLD = 0.3; // 30% failure rate over the 10-minute window

export function ImagesTab() {
  const fetchLogs = useServerFn(listImgProxyLogs);
  const fetchSettings = useServerFn(getImgProxySettings);
  const saveSettings = useServerFn(updateImgProxySettings);
  const lookupOne = useServerFn(lookupProductImage);
  const bulkLookup = useServerFn(bulkLookupProductImages);
  const fetchStats = useServerFn(listImageOverrideStats);

  const products = useMergedProducts();

  const [rows, setRows] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<{ total: number; failures: number }>({ total: 0, failures: 0 });
  const [logsBusy, setLogsBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "fail">("all");

  const [domain, setDomain] = useState("muslly.com");
  const [hosts, setHosts] = useState<string[]>([]);
  const [newHost, setNewHost] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Test tool
  const [testUrl, setTestUrl] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; reason: string; duration_ms: number; proxyUrl: string } | null>(null);

  // Product image fetcher
  const [imgStats, setImgStats] = useState<{ total: number; found: number; missing: number } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ processed: number; found: number } | null>(null);

  async function loadLogs() {
    setLogsBusy(true);
    try {
      const res = await fetchLogs();
      setRows(res.rows as LogRow[]);
      setStats({ total: res.total, failures: res.failures });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحميل السجل");
    } finally {
      setLogsBusy(false);
    }
  }

  async function loadSettings() {
    try {
      const s = await fetchSettings();
      setDomain(s.image_domain ?? "muslly.com");
      setHosts((s.allowed_hosts as string[]) ?? []);
      setUpdatedAt(s.updated_at);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحميل الإعدادات");
    }
  }

  async function loadImgStats() {
    try {
      const s = await fetchStats();
      setImgStats(s);
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    void loadLogs();
    void loadSettings();
    void loadImgStats();
  }, []);

  // Auto-refresh logs every 30s so the alert banner stays current.
  useEffect(() => {
    const t = setInterval(() => { void loadLogs(); }, 30_000);
    return () => clearInterval(t);
  }, []);

  // Failure rate in last 10 minutes
  const recentStats = useMemo(() => {
    const tenMinAgo = Date.now() - 10 * 60_000;
    const recent = rows.filter((r) => new Date(r.created_at).getTime() >= tenMinAgo);
    const total = recent.length;
    const fails = recent.filter((r) => !r.ok).length;
    const rate = total ? fails / total : 0;
    return { total, fails, rate };
  }, [rows]);

  const showAlert = recentStats.total >= 5 && recentStats.rate >= FAILURE_THRESHOLD;

  function addHost() {
    const h = newHost.trim().toLowerCase();
    if (!h) return;
    if (hosts.includes(h)) { toast.info("المضيف موجود بالفعل"); return; }
    setHosts([...hosts, h]); setNewHost("");
  }
  function removeHost(h: string) { setHosts(hosts.filter((x) => x !== h)); }

  async function save() {
    setSettingsBusy(true);
    try {
      await saveSettings({ data: { image_domain: domain.trim().toLowerCase(), allowed_hosts: hosts } });
      toast.success("تم حفظ الإعدادات");
      await loadSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally { setSettingsBusy(false); }
  }

  // ---- Export ----
  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportJSON() {
    downloadFile(JSON.stringify(rows, null, 2), `img_proxy_logs_${Date.now()}.json`, "application/json");
  }
  function exportCSV() {
    const header = ["id", "created_at", "host", "url", "status", "ok", "error", "duration_ms"];
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [header.join(","), ...rows.map((r) => header.map((h) => escape((r as any)[h])).join(","))];
    downloadFile("\ufeff" + lines.join("\n"), `img_proxy_logs_${Date.now()}.csv`, "text/csv;charset=utf-8");
  }

  // ---- URL test tool ----
  async function runTest() {
    if (!testUrl.trim()) return;
    setTestBusy(true); setTestResult(null);
    const proxyUrl = `/api/public/img?u=${encodeURIComponent(testUrl.trim())}`;
    const t0 = Date.now();
    try {
      const res = await fetch(proxyUrl, { method: "GET" });
      const duration = Date.now() - t0;
      const reason = res.ok ? "OK" : (await res.text().catch(() => res.statusText)) || res.statusText;
      setTestResult({ ok: res.ok, status: res.status, reason: reason.slice(0, 200), duration_ms: duration, proxyUrl });
      // refresh logs to show the new entry
      void loadLogs();
    } catch (e) {
      setTestResult({
        ok: false, status: 0,
        reason: e instanceof Error ? e.message : "network_error",
        duration_ms: Date.now() - t0, proxyUrl,
      });
    } finally { setTestBusy(false); }
  }

  // ---- Bulk image fetch (OpenFoodFacts) ----
  async function runBulkFetch() {
    const overrideKeys = new Set<string>();
    // Products lacking real images = pointing to Unsplash placeholder pools.
    const candidates = products
      .filter((p) => /unsplash\.com/.test(p.img))
      .slice(0, 25)
      .map((p) => ({
        dedupe_key: productDedupeKey(p),
        name: p.name,
        brand: p.brand ?? "",
      }))
      .filter((it) => !overrideKeys.has(it.dedupe_key));
    if (candidates.length === 0) {
      toast.info("لا توجد منتجات تحتاج تحديث صور");
      return;
    }
    setBulkBusy(true); setBulkResult(null);
    try {
      const res = await bulkLookup({ data: { items: candidates } });
      setBulkResult({ processed: res.processed, found: res.found });
      toast.success(`تمت معالجة ${res.processed} منتج — وُجدت ${res.found} صورة`);
      await loadImgStats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الجلب");
    } finally { setBulkBusy(false); }
  }

  async function fetchOneByName(name: string, brand: string, dedupe_key: string) {
    try {
      const r = await lookupOne({ data: { dedupe_key, name, brand } });
      if (r.found) toast.success(`تم — المصدر: ${r.source}`);
      else toast.warning(`لم يُعثر على صورة — السبب: ${r.reason ?? "غير معروف"}`);
      await loadImgStats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    }
  }

  const visible = rows.filter((r) => (filter === "fail" ? !r.ok : true));

  return (
    <div className="space-y-6">
      {/* Failure alert banner */}
      {showAlert && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <div className="font-black">⚠️ نسبة فشل مرتفعة في بروكسي الصور</div>
            <p className="mt-1 text-sm">
              خلال آخر 10 دقائق: {recentStats.fails} فشل من أصل {recentStats.total} محاولة
              ({Math.round(recentStats.rate * 100)}%، الحد {Math.round(FAILURE_THRESHOLD * 100)}%).
              تحقّق من قائمة السماح وسجل الأخطاء أدناه.
            </p>
          </div>
          <button onClick={loadLogs} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-black text-destructive-foreground">تحديث</button>
        </div>
      )}

      {/* Settings */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">🖼️ إعدادات بروكسي الصور</h2>
          {updatedAt && <span className="text-xs text-muted-foreground">آخر تحديث: {new Date(updatedAt).toLocaleString("ar")}</span>}
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">نطاق الصور المعتمد</span>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} dir="ltr" className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono" placeholder="muslly.com" />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">إضافة مضيف للقائمة البيضاء</span>
            <div className="flex gap-2">
              <input value={newHost} onChange={(e) => setNewHost(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHost())} dir="ltr" placeholder="example.com" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono" />
              <button onClick={addHost} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-black text-primary-foreground hover:opacity-90"><Plus className="size-4" /> إضافة</button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-bold text-muted-foreground">المضيفون المسموح بهم ({hosts.length})</div>
          {hosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">لا يوجد مضيفون.</div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {hosts.map((h) => (
                <li key={h} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">
                  <span dir="ltr" className="font-mono">{h}</span>
                  <button onClick={() => removeHost(h)} className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"><X className="size-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={save} disabled={settingsBusy || hosts.length === 0} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-50">
            {settingsBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">التعديلات تُطبَّق تلقائيًا خلال 60 ثانية. الحد الأقصى: 60 طلب/دقيقة لكل IP.</p>
      </section>

      {/* URL test tool */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h2 className="text-lg font-black">أداة اختبار البروكسي</h2>
        </header>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runTest())}
            dir="ltr"
            placeholder="https://images.unsplash.com/photo-..."
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
          />
          <button onClick={runTest} disabled={testBusy || !testUrl.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">
            {testBusy ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            تشغيل
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${testResult.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
            <div className="flex items-center gap-2 font-black">
              {testResult.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              HTTP {testResult.status} · {testResult.duration_ms} ms
            </div>
            <div className="mt-1 text-xs">السبب: <span className="font-mono">{testResult.reason}</span></div>
            <div className="mt-1 text-xs">رابط البروكسي: <span dir="ltr" className="font-mono break-all">{testResult.proxyUrl}</span></div>
            {testResult.ok && (
              <img src={testResult.proxyUrl} alt="preview" className="mt-2 max-h-40 rounded-lg border border-border bg-white" />
            )}
          </div>
        )}
      </section>

      {/* Product image fetcher */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex items-center gap-2">
          <Images className="size-5 text-primary" />
          <h2 className="text-lg font-black">جلب صور المنتجات الحقيقية (OpenFoodFacts)</h2>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="منتجات لها صورة مخصصة" value={imgStats ? `${imgStats.found}` : "—"} />
          <Stat label="بحثٌ بدون نتيجة" value={imgStats ? `${imgStats.missing}` : "—"} />
          <Stat label="إجمالي المنتجات في الكتالوج" value={`${products.length}`} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={runBulkFetch} disabled={bulkBusy} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-50">
            {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Images className="size-4" />}
            معالجة 25 منتج
          </button>
          {bulkResult && (
            <span className="text-xs text-muted-foreground">آخر دفعة: {bulkResult.found} وُجدت من أصل {bulkResult.processed}.</span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          المصدر: OpenFoodFacts (مجاني، يغطي الأدوية بدون وصفة، المكملات، منتجات العناية والأطفال). كرّر الضغط لمعالجة المزيد. الصور تظهر تلقائيًا في الكتالوج بعد التخزين.
        </p>
      </section>

      {/* Logs */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black">سجل بروكسي الصور</h2>
            <p className="text-xs text-muted-foreground">آخر {stats.total} محاولة · {stats.failures} فشل · آخر 10د: {recentStats.fails}/{recentStats.total} ({Math.round(recentStats.rate * 100)}%)</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "fail")} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-bold">
              <option value="all">الكل</option>
              <option value="fail">الفاشلة فقط</option>
            </select>
            <button onClick={exportCSV} disabled={rows.length === 0} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent disabled:opacity-50"><Download className="size-3.5" /> CSV</button>
            <button onClick={exportJSON} disabled={rows.length === 0} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent disabled:opacity-50"><Download className="size-3.5" /> JSON</button>
            <button onClick={loadLogs} disabled={logsBusy} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent disabled:opacity-50">
              {logsBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} تحديث
            </button>
          </div>
        </header>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <ImageOff className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد سجلات.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-right">
                <tr>
                  <th className="px-2 py-2 font-black">الحالة</th>
                  <th className="px-2 py-2 font-black">المضيف</th>
                  <th className="px-2 py-2 font-black">HTTP</th>
                  <th className="px-2 py-2 font-black">السبب</th>
                  <th className="px-2 py-2 font-black">المدة</th>
                  <th className="px-2 py-2 font-black">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-2 py-2">
                      {r.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-3.5" /> ناجحة</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3.5" /> فاشلة</span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono" dir="ltr">{r.host ?? "—"}</td>
                    <td className="px-2 py-2 font-mono">{r.status}</td>
                    <td className="px-2 py-2 max-w-[280px]"><span className="line-clamp-2 text-[11px]">{r.error ?? "—"}</span></td>
                    <td className="px-2 py-2 font-mono">{r.duration_ms ?? "—"}ms</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black text-primary">{value}</div>
    </div>
  );
}
