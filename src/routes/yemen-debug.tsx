import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { readPerf, type PerfSnapshot } from "@/lib/perf-metrics";
import { readSwLog, type SwLogEntry } from "@/lib/register-sw";

export const Route = createFileRoute("/yemen-debug")({
  component: YemenDebugPage,
  head: () => ({
    meta: [
      { title: "تشخيص الشبكة اليمنية — Yemen Debug" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type ProbeRow = {
  label: string;
  url: string;
  status?: number;
  ok: boolean;
  ttfb?: number;
  total?: number;
  bytes?: number;
  error?: string;
};

type DnsRow = { host: string; ok: boolean; ips?: string[]; error?: string };

type Report = {
  generatedAt: string;
  shareCode: string;
  origin: string;
  ua: string;
  language: string;
  platform: string;
  online: boolean;
  connection: {
    effectiveType?: string;
    downlinkMbps?: number;
    rttMs?: number;
    saveData?: boolean;
    type?: string;
  };
  screen: { w: number; h: number; dpr: number };
  perf: PerfSnapshot;
  sw: {
    supported: boolean;
    controller: boolean;
    scope?: string;
    state?: string;
    version?: string;
    cacheNames: string[];
    waiting: boolean;
  };
  probes: ProbeRow[];
  dns: DnsRow[];
  logs: SwLogEntry[];
};

const PROBES: { label: string; url: string }[] = [
  { label: "Home (HTML)", url: "/" },
  { label: "Manifest", url: "/manifest.webmanifest" },
  { label: "Health API", url: "/api/public/health" },
  { label: "Products RPC", url: "/_serverFn/health-ping" }, // may 404, time still useful
  { label: "Supabase Auth health", url: "https://swyqqlpbjemarzzdxctw.supabase.co/auth/v1/health" },
  { label: "Cloudflare /cdn-cgi/trace", url: "/cdn-cgi/trace" },
];

const DNS_HOSTS = [
  "muslly.com",
  "www.muslly.com",
  "swyqqlpbjemarzzdxctw.supabase.co",
  "ympharma.lovable.app",
];

async function timedFetch(url: string): Promise<ProbeRow> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "omit" });
    const ttfb = Math.round(performance.now() - t0);
    let bytes = 0;
    try {
      const buf = await res.clone().arrayBuffer();
      bytes = buf.byteLength;
    } catch { /* ignore */ }
    return {
      label: url,
      url,
      status: res.status,
      ok: res.ok,
      ttfb,
      total: Math.round(performance.now() - t0),
      bytes,
    };
  } catch (err) {
    return {
      label: url,
      url,
      ok: false,
      total: Math.round(performance.now() - t0),
      error: String(err),
    };
  }
}

async function dohResolve(host: string): Promise<DnsRow> {
  // Cloudflare DoH — works from the browser, gives us a ground-truth
  // DNS view independent from the device's ISP resolver. If THIS call
  // fails on YemenNet, it's the ISP DNS / 1.1.1.1 path that's blocked.
  try {
    const res = await fetch(
      `https://1.1.1.1/dns-query?name=${encodeURIComponent(host)}&type=A`,
      { headers: { accept: "application/dns-json" } },
    );
    if (!res.ok) return { host, ok: false, error: `DoH ${res.status}` };
    const data = (await res.json()) as { Answer?: { data: string }[] };
    const ips = (data.Answer || []).map((a) => a.data);
    return { host, ok: ips.length > 0, ips };
  } catch (err) {
    return { host, ok: false, error: String(err) };
  }
}

function shareCode(report: Omit<Report, "shareCode">): string {
  // Compact, copy-pasteable signature line.
  const failed = report.probes.filter((p) => !p.ok).length;
  const dnsFail = report.dns.filter((d) => !d.ok).length;
  const avgTtfb = Math.round(
    report.probes.reduce((s, p) => s + (p.ttfb || 0), 0) / Math.max(1, report.probes.length),
  );
  const ts = new Date(report.generatedAt).getTime().toString(36);
  const net = report.connection.effectiveType || "?";
  return `YMN-${ts}-N${net}-T${avgTtfb}-F${failed}-D${dnsFail}-S${report.perf.swFallbackCount}`;
}

function YemenDebugPage() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState<string>("");

  const run = useCallback(async () => {
    setRunning(true);
    setCopied("");
    const perf = readPerf();
    const logs = [...readSwLog()].slice(-50);

    // Service worker info
    let sw: Report["sw"] = {
      supported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
      controller: false,
      cacheNames: [],
      waiting: false,
    };
    if (sw.supported) {
      const reg = await navigator.serviceWorker.getRegistration();
      let cacheNames: string[] = [];
      try { cacheNames = await caches.keys(); } catch { /* ignore */ }
      sw = {
        supported: true,
        controller: !!navigator.serviceWorker.controller,
        scope: reg?.scope,
        state: reg?.active?.state ?? reg?.installing?.state ?? reg?.waiting?.state,
        waiting: !!reg?.waiting,
        version: typeof window !== "undefined" ? window.__SW_VERSION__ : undefined,
        cacheNames,
      };
    }

    const [probes, dns] = await Promise.all([
      Promise.all(PROBES.map((p) => timedFetch(p.url).then((r) => ({ ...r, label: p.label })))),
      Promise.all(DNS_HOSTS.map(dohResolve)),
    ]);

    const conn = (navigator as any).connection || {};
    const partial: Omit<Report, "shareCode"> = {
      generatedAt: new Date().toISOString(),
      origin: window.location.origin,
      ua: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      online: navigator.onLine,
      connection: {
        effectiveType: conn.effectiveType,
        downlinkMbps: conn.downlink,
        rttMs: conn.rtt,
        saveData: conn.saveData,
        type: conn.type,
      },
      screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio },
      perf,
      sw,
      probes,
      dns,
      logs,
    };

    const final: Report = { ...partial, shareCode: shareCode(partial) };
    setReport(final);
    setRunning(false);
  }, []);

  useEffect(() => { run(); }, [run]);

  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      alert("تعذر النسخ — انسخ يدوياً.");
    }
  }, []);

  const downloadJson = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yemen-debug-${report.shareCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">تشخيص الشبكة (Yemen Debug)</h1>
        <p className="text-sm text-muted-foreground">
          صفحة داخلية لجمع أدلة فعلية من المستخدم. اضغط «تشغيل التشخيص» ثم أرسل لنا
          <span className="font-mono"> Share Code </span> أو ملف JSON.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {running ? "جارٍ التشخيص…" : "تشغيل التشخيص"}
        </button>
        {report && (
          <>
            <button
              type="button"
              onClick={() => copy(report.shareCode, "code")}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              {copied === "code" ? "✓ تم النسخ" : "نسخ Share Code"}
            </button>
            <button
              type="button"
              onClick={() => copy(JSON.stringify(report, null, 2), "json")}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              {copied === "json" ? "✓ تم النسخ" : "نسخ JSON كامل"}
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              تنزيل JSON
            </button>
          </>
        )}
      </div>

      {report && (
        <>
          <section className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
            <div className="text-xs text-muted-foreground">رمز المشاركة (Share Code)</div>
            <div className="font-mono text-lg select-all break-all">{report.shareCode}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              أرسل هذا الرمز عبر واتساب لفريق الدعم. يحتوي على ملخّص الحالة بدون أي بيانات شخصية.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-lg font-semibold">حالة الجهاز والشبكة</h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">متصل</dt>
              <dd>{report.online ? "نعم" : "لا"}</dd>
              <dt className="text-muted-foreground">نوع الشبكة</dt>
              <dd>{report.connection.effectiveType ?? "غير متاح"}</dd>
              <dt className="text-muted-foreground">السرعة (Downlink)</dt>
              <dd>{report.connection.downlinkMbps != null ? `${report.connection.downlinkMbps} Mbps` : "—"}</dd>
              <dt className="text-muted-foreground">RTT</dt>
              <dd>{report.connection.rttMs != null ? `${report.connection.rttMs} ms` : "—"}</dd>
              <dt className="text-muted-foreground">Save-Data</dt>
              <dd>{report.connection.saveData ? "مفعّل" : "معطّل"}</dd>
              <dt className="text-muted-foreground">المنصة</dt>
              <dd className="break-all">{report.platform}</dd>
              <dt className="text-muted-foreground">اللغة</dt>
              <dd>{report.language}</dd>
              <dt className="text-muted-foreground">المتصفح</dt>
              <dd className="break-all text-xs">{report.ua}</dd>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-lg font-semibold">مؤشرات الأداء</h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">FCP</dt>
              <dd>{report.perf.fcp != null ? `${report.perf.fcp} ms` : "—"}</dd>
              <dt className="text-muted-foreground">LCP</dt>
              <dd>{report.perf.lcp != null ? `${report.perf.lcp} ms` : "—"}</dd>
              <dt className="text-muted-foreground">TTFB (Nav)</dt>
              <dd>{report.perf.ttfb != null ? `${report.perf.ttfb} ms` : "—"}</dd>
              <dt className="text-muted-foreground">DOM Ready</dt>
              <dd>{report.perf.domReady != null ? `${report.perf.domReady} ms` : "—"}</dd>
              <dt className="text-muted-foreground">SW Fallback Count</dt>
              <dd className={report.perf.swFallbackCount > 0 ? "text-amber-600 font-medium" : ""}>
                {report.perf.swFallbackCount}
              </dd>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-lg font-semibold">اختبارات الاتصال (TTFB / Status)</h2>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-right">
                <tr>
                  <th className="py-1">الهدف</th>
                  <th className="py-1">الحالة</th>
                  <th className="py-1">TTFB</th>
                  <th className="py-1">الحجم</th>
                </tr>
              </thead>
              <tbody>
                {report.probes.map((p) => (
                  <tr key={p.url} className="border-t border-border align-top">
                    <td className="py-1">
                      <div>{p.label}</div>
                      <div className="text-xs text-muted-foreground break-all">{p.url}</div>
                    </td>
                    <td className="py-1">
                      <span className={p.ok ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                        {p.ok ? `✓ ${p.status}` : `✗ ${p.error ?? p.status ?? "fail"}`}
                      </span>
                    </td>
                    <td className="py-1">{p.ttfb ?? "—"} ms</td>
                    <td className="py-1">{p.bytes ? `${(p.bytes / 1024).toFixed(1)} KB` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-lg font-semibold">DNS (عبر Cloudflare DoH)</h2>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-right">
                <tr>
                  <th className="py-1">المضيف</th>
                  <th className="py-1">النتيجة</th>
                  <th className="py-1">IPs</th>
                </tr>
              </thead>
              <tbody>
                {report.dns.map((d) => (
                  <tr key={d.host} className="border-t border-border align-top">
                    <td className="py-1 break-all">{d.host}</td>
                    <td className="py-1">
                      <span className={d.ok ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                        {d.ok ? "✓" : `✗ ${d.error ?? "no answer"}`}
                      </span>
                    </td>
                    <td className="py-1 text-xs">{d.ips?.join(", ") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              إذا فشلت كل صفوف DNS هنا فالمشكلة في DNS الخاص بمزود الخدمة (يمكن حلّها بتغيير DNS إلى 1.1.1.1 أو 8.8.8.8).
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h2 className="text-lg font-semibold">Service Worker</h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">مدعوم</dt>
              <dd>{report.sw.supported ? "نعم" : "لا"}</dd>
              <dt className="text-muted-foreground">يتحكّم</dt>
              <dd>{report.sw.controller ? "نعم" : "لا"}</dd>
              <dt className="text-muted-foreground">الإصدار</dt>
              <dd>{report.sw.version ?? "—"}</dd>
              <dt className="text-muted-foreground">الحالة</dt>
              <dd>{report.sw.state ?? "—"}</dd>
              <dt className="text-muted-foreground">الكاشات</dt>
              <dd className="break-all text-xs">{report.sw.cacheNames.join(", ") || "—"}</dd>
            </dl>
          </section>

          {report.logs.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">سجلّ SW (آخر {report.logs.length})</h2>
              <ul className="space-y-1 text-xs font-mono max-h-64 overflow-y-auto">
                {report.logs.map((e, i) => (
                  <li key={i} className={
                    e.level === "error" ? "text-destructive"
                    : e.level === "warn" ? "text-amber-600"
                    : "text-foreground/80"
                  }>
                    <span className="text-muted-foreground">
                      {new Date(e.ts).toLocaleTimeString("ar-EG")}
                    </span>{" "}
                    [{e.level}] {e.msg}{e.meta ? " " + JSON.stringify(e.meta) : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
