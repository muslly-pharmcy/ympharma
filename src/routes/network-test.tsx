import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  readSwLog,
  forceUpdateCheck,
  unregisterServiceWorker,
  type SwLogEntry,
} from "@/lib/register-sw";
import { readPerf, type PerfSnapshot } from "@/lib/perf-metrics";

export const Route = createFileRoute("/network-test")({
  component: NetworkTestPage,
  head: () => ({
    meta: [
      { title: "اختبار الشبكة — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type ProbeResult = {
  url: string;
  ok: boolean;
  status?: number;
  ms?: number;
  fromCache?: boolean;
  error?: string;
};

const PROBES = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/products",
  "/api/public/health",
];

function NetworkTestPage() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [logs, setLogs] = useState<SwLogEntry[]>([]);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);
  const [perf, setPerf] = useState<PerfSnapshot>(() => readPerf());
  const [swInfo, setSwInfo] = useState<{
    supported: boolean;
    controller: boolean;
    scope?: string;
    state?: string;
    waiting: boolean;
    version?: string;
    cacheNames: string[];
  }>({ supported: false, controller: false, waiting: false, cacheNames: [] });

  const refreshLogs = useCallback(() => setLogs([...readSwLog()].reverse()), []);

  const refreshSw = useCallback(async () => {
    const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    if (!supported) {
      setSwInfo({ supported: false, controller: false, waiting: false, cacheNames: [] });
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    let cacheNames: string[] = [];
    try {
      cacheNames = await caches.keys();
    } catch {
      /* ignore */
    }
    setSwInfo({
      supported: true,
      controller: !!navigator.serviceWorker.controller,
      scope: reg?.scope,
      state: reg?.active?.state ?? reg?.installing?.state ?? reg?.waiting?.state,
      waiting: !!reg?.waiting,
      version: typeof window !== "undefined" ? window.__SW_VERSION__ : undefined,
      cacheNames,
    });
  }, []);

  useEffect(() => {
    refreshLogs();
    refreshSw();
    const onLogs = () => refreshLogs();
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("sw:log", onLogs);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const t = setInterval(refreshSw, 3000);
    return () => {
      window.removeEventListener("sw:log", onLogs);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(t);
    };
  }, [refreshLogs, refreshSw]);

  const runProbes = useCallback(async () => {
    setRunning(true);
    const out: ProbeResult[] = [];
    for (const url of PROBES) {
      const started = performance.now();
      try {
        const res = await fetch(url, { cache: "no-store" });
        out.push({
          url,
          ok: res.ok,
          status: res.status,
          ms: Math.round(performance.now() - started),
          fromCache: res.headers.get("x-from-sw") === "1",
        });
      } catch (err) {
        out.push({
          url,
          ok: false,
          ms: Math.round(performance.now() - started),
          error: String(err),
        });
      }
      setResults([...out]);
    }
    setRunning(false);
  }, []);

  const clearCaches = useCallback(async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await refreshSw();
      alert("تم مسح الكاش. أعد تحميل الصفحة.");
    } catch (err) {
      alert("فشل المسح: " + String(err));
    }
  }, [refreshSw]);

  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">اختبار الشبكة و Service Worker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          صفحة داخلية للتأكد أن الموقع يفتح على يمن نت / تليمن حتى أثناء انقطاع الشبكة.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-lg font-semibold">حالة الاتصال</h2>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              online ? "bg-emerald-500" : "bg-destructive"
            }`}
          />
          <span>{online ? "متصل (Online)" : "غير متصل (Offline)"}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          لمحاكاة الانقطاع: افتح DevTools → Network → اختر <code>Offline</code>، ثم أعد التحميل.
          يجب أن تظل الصفحة تعمل من الكاش.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-lg font-semibold">حالة Service Worker</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">مدعوم</dt>
          <dd>{swInfo.supported ? "نعم" : "لا"}</dd>
          <dt className="text-muted-foreground">يتحكّم في الصفحة</dt>
          <dd>{swInfo.controller ? "نعم" : "لا"}</dd>
          <dt className="text-muted-foreground">النطاق (scope)</dt>
          <dd className="break-all">{swInfo.scope ?? "—"}</dd>
          <dt className="text-muted-foreground">الحالة</dt>
          <dd>{swInfo.state ?? "—"}</dd>
          <dt className="text-muted-foreground">الإصدار</dt>
          <dd>{swInfo.version ?? "—"}</dd>
          <dt className="text-muted-foreground">تحديث جاهز</dt>
          <dd>{swInfo.waiting ? "نعم" : "لا"}</dd>
          <dt className="text-muted-foreground">الكاشات</dt>
          <dd className="break-all">{swInfo.cacheNames.join(", ") || "—"}</dd>
        </dl>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={runProbes}
            disabled={running}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? "جارٍ الاختبار…" : "اختبار الروابط"}
          </button>
          <button
            type="button"
            onClick={() => forceUpdateCheck().then(refreshSw)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            فحص التحديث
          </button>
          <button
            type="button"
            onClick={() =>
              swInfo.waiting && window.__SW_APPLY_UPDATE__
                ? window.__SW_APPLY_UPDATE__()
                : alert("لا يوجد إصدار في الانتظار")
            }
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            تطبيق التحديث الآن
          </button>
          <button
            type="button"
            onClick={clearCaches}
            className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            مسح الكاش
          </button>
          <button
            type="button"
            onClick={async () => {
              await unregisterServiceWorker();
              await refreshSw();
              alert("تم إلغاء التسجيل.");
            }}
            className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            إلغاء تسجيل SW
          </button>
        </div>
      </section>

      {results.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="text-lg font-semibold">نتائج الاختبار</h2>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-right py-1">الرابط</th>
                <th className="text-right py-1">الحالة</th>
                <th className="text-right py-1">الزمن</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.url} className="border-t border-border">
                  <td className="py-1 break-all">{r.url}</td>
                  <td className="py-1">
                    <span
                      className={
                        r.ok ? "text-emerald-600 font-medium" : "text-destructive font-medium"
                      }
                    >
                      {r.ok ? `✓ ${r.status}` : `✗ ${r.error ?? r.status ?? "fail"}`}
                    </span>
                  </td>
                  <td className="py-1">{r.ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">سجلّ SW (آخر {logs.length})</h2>
          <button
            type="button"
            onClick={refreshLogs}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
          >
            تحديث
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد إدخالات بعد.</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono max-h-80 overflow-y-auto">
            {logs.map((e, i) => (
              <li
                key={i}
                className={
                  e.level === "error"
                    ? "text-destructive"
                    : e.level === "warn"
                      ? "text-amber-600"
                      : "text-foreground/80"
                }
              >
                <span className="text-muted-foreground">
                  {new Date(e.ts).toLocaleTimeString("ar-EG")}
                </span>{" "}
                [{e.level}] {e.msg}
                {e.meta ? " " + JSON.stringify(e.meta) : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
