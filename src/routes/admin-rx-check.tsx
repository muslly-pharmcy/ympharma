import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { parseSignedUrl, formatExpiry, checkUrlReachable, regenerateSignedUrl } from "@/lib/rx-url";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Play, ShieldAlert, Clock, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv-export";

export const Route = createFileRoute("/admin-rx-check")({
  head: () => ({ meta: [{ title: "فحص روابط الروشتات — الإدارة" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: RxCheckPage,
});

type Row = {
  rxId: string;
  customer: string;
  url: string;
  index: number;
  expiresAt: Date | null;
  expired: boolean;
  expiryLabel: string;
  expiryTone: "ok" | "warn" | "expired" | "unknown";
  status?: "pending" | "ok" | "fail";
  httpStatus?: number | null;
  ms?: number;
  error?: string;
};

function RxCheckPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [regenBusy, setRegenBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, customer_name, image_urls")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const out: Row[] = [];
      for (const r of data ?? []) {
        (r.image_urls ?? []).forEach((u: string, i: number) => {
          const info = parseSignedUrl(u);
          const f = formatExpiry(info);
          out.push({
            rxId: r.id, customer: r.customer_name, url: u, index: i + 1,
            expiresAt: info.expiresAt, expired: info.expired,
            expiryLabel: f.label, expiryTone: f.tone,
          });
        });
      }
      setRows(out);
      setDone(0);
    } catch (e: any) {
      toast.error(e?.message || "تعذر تحميل الروشتات");
    } finally { setLoading(false); }
  }

  async function runChecks() {
    if (rows.length === 0) return;
    setRunning(true);
    setDone(0);
    setRows((r) => r.map((x) => ({ ...x, status: "pending", httpStatus: undefined, ms: undefined, error: undefined })));
    // Limit concurrency to 6.
    const queue = [...rows.keys()];
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length > 0) {
        const i = queue.shift()!;
        const url = rows[i].url;
        const res = await checkUrlReachable(url);
        setRows((cur) => {
          const next = cur.slice();
          next[i] = { ...next[i], status: res.ok ? "ok" : "fail", httpStatus: res.status, ms: res.ms, error: res.error };
          return next;
        });
        setDone((d) => d + 1);
      }
    });
    await Promise.all(workers);
    setRunning(false);
  }

  async function regenOne(row: Row, idx: number) {
    setRegenBusy(`${row.rxId}-${row.index}`);
    try {
      const fresh = await regenerateSignedUrl(row.url);
      // Update DB row: replace this url in array.
      const { data, error: e1 } = await supabase.from("prescriptions").select("image_urls").eq("id", row.rxId).single();
      if (e1 || !data) throw e1 || new Error("not found");
      const urls: string[] = (data.image_urls ?? []).slice();
      urls[row.index - 1] = fresh;
      const { error: e2 } = await supabase.from("prescriptions").update({ image_urls: urls }).eq("id", row.rxId);
      if (e2) throw e2;
      const info = parseSignedUrl(fresh);
      const f = formatExpiry(info);
      setRows((cur) => {
        const next = cur.slice();
        next[idx] = { ...next[idx], url: fresh, expiresAt: info.expiresAt, expired: info.expired, expiryLabel: f.label, expiryTone: f.tone, status: undefined };
        return next;
      });
      toast.success("تم تجديد الرابط");
    } catch (e: any) {
      toast.error(e?.message || "فشل التجديد");
    } finally { setRegenBusy(null); }
  }

  const total = rows.length;
  const okCount = rows.filter((r) => r.status === "ok").length;
  const failCount = rows.filter((r) => r.status === "fail").length;
  const expiredCount = rows.filter((r) => r.expired).length;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">فحص روابط الروشتات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              أداة داخلية للتحقق من صلاحية روابط صور الروشتات قبل مشاركتها مع الإدارة، مع إمكانية تجديد الرابط فورياً.
            </p>
          </div>
          <Link to="/admin" className="rounded-xl bg-secondary px-3 py-2 text-xs font-black hover:bg-accent">← لوحة الإدمن</Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={load} disabled={loading || running}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            تحميل الروشتات
          </button>
          <button onClick={runChecks} disabled={running || rows.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            بدء الفحص ({rows.length})
          </button>
          {running && <span className="text-xs text-muted-foreground">{done}/{total}</span>}
        </div>

        {total > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="إجمالي الروابط" value={total} tone="default" />
            <Stat label="منتهية الصلاحية" value={expiredCount} tone={expiredCount ? "rose" : "default"} />
            <Stat label="فحص ناجح" value={okCount} tone={okCount ? "emerald" : "default"} />
            <Stat label="فحص فاشل" value={failCount} tone={failCount ? "rose" : "default"} />
          </div>
        )}

        <div className="overflow-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary text-[11px] font-black">
              <tr>
                <th className="px-3 py-2">الروشتة</th>
                <th className="px-3 py-2">العميل</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">انتهاء الرابط</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">HTTP</th>
                <th className="px-3 py-2">الزمن</th>
                <th className="px-3 py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">اضغط "تحميل الروشتات" للبدء.</td></tr>
              )}
              {rows.map((r, idx) => (
                <tr key={`${r.rxId}-${r.index}`} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-bold" dir="ltr">{r.rxId}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.index}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      r.expiryTone === "expired" ? "bg-rose-100 text-rose-700" :
                      r.expiryTone === "warn" ? "bg-amber-100 text-amber-700" :
                      r.expiryTone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"
                    }`}>
                      {r.expiryTone === "expired" ? <ShieldAlert className="size-3" /> : r.expiryTone === "warn" ? <Clock className="size-3" /> : null}
                      {r.expiryLabel}
                    </span>
                    {r.expiresAt && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">{r.expiresAt.toLocaleString("ar-EG")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "pending" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                    {r.status === "ok" && <span className="inline-flex items-center gap-1 text-emerald-700 font-black"><CheckCircle2 className="size-3.5" /> سليم</span>}
                    {r.status === "fail" && <span className="inline-flex items-center gap-1 text-rose-700 font-black" title={r.error}><XCircle className="size-3.5" /> فشل</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.httpStatus ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">{r.ms != null ? `${r.ms}ms` : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <a href={r.url} target="_blank" rel="noreferrer" className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold hover:bg-accent">فتح</a>
                      <button
                        onClick={() => regenOne(r, idx)}
                        disabled={regenBusy === `${r.rxId}-${r.index}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        {regenBusy === `${r.rxId}-${r.index}` ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                        تجديد
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "default" | "emerald" | "rose" }) {
  const cls = tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : "bg-secondary text-foreground";
  return (
    <div className={`rounded-xl p-3 text-center ${cls}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[11px] font-bold">{label}</p>
    </div>
  );
}
