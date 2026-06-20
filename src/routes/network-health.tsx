import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/network-health")({
  component: NetworkHealthPage,
  head: () => ({
    meta: [
      { title: "Network Health — muslly.com" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Status = "ok" | "warn" | "fail" | "pending";

type Row = {
  key: string;
  label: string;
  status: Status;
  detail: string;
  hint?: string;
  latencyMs?: number;
};

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

async function doh(name: string, type: string): Promise<string[]> {
  const r = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { accept: "application/dns-json" } },
  );
  const j = await r.json();
  const ans = (j.Answer ?? []) as Array<{ type: number; data: string }>;
  const want = type === "A" ? 1 : type === "AAAA" ? 28 : type === "NS" ? 2 : 16;
  return ans.filter((a) => a.type === want).map((a) => a.data);
}

function isCloudflareIp(ip: string): boolean {
  // Cloudflare anycast ranges most commonly seen at the edge
  return /^(104\.(1[6-9]|2\d|3[01])\.)|^(172\.6[4-7]\.)|^(162\.158\.)|^(108\.162\.)|^(141\.101\.)/.test(
    ip,
  );
}

async function timedHead(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = performance.now();
  try {
    const r = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      cache: "no-store",
      mode: "cors",
    });
    const ms = Math.round(performance.now() - start);
    return { ok: r.ok, status: r.status, ms };
  } catch (e) {
    return { ok: false, status: 0, ms: Math.round(performance.now() - start), error: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

function StatusDot({ s }: { s: Status }) {
  const c =
    s === "ok"
      ? "bg-emerald-500"
      : s === "warn"
        ? "bg-amber-500"
        : s === "fail"
          ? "bg-red-500"
          : "bg-zinc-400";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

function NetworkHealthPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    const out: Row[] = [];

    // 1. DNS muslly.com via Cloudflare DoH
    try {
      const [a, aaaa, ns] = await Promise.all([
        doh("muslly.com", "A"),
        doh("muslly.com", "AAAA"),
        doh("muslly.com", "NS"),
      ]);
      const proxied = a.some(isCloudflareIp);
      const onLegacy = a.includes("185.158.133.1");
      const nsOnCf = ns.some((n) => /\.ns\.cloudflare\.com\.?$/i.test(n));
      const status: Status = proxied ? "ok" : onLegacy ? "fail" : "warn";
      out.push({
        key: "dns-muslly",
        label: "DNS — muslly.com",
        status,
        detail: `A=${a.join(", ") || "∅"} | AAAA=${aaaa.join(", ") || "none"} | NS=${ns.join(", ") || "?"}`,
        hint:
          status === "fail"
            ? "Still on legacy 185.158.133.1 — YemenNet at risk. Migrate DNS to Cloudflare (see docs/yemen-infra-audit.md §2)."
            : status === "warn"
              ? `NS ${nsOnCf ? "is" : "is NOT"} Cloudflare; A record not in Cloudflare anycast range.`
              : "Proxied through Cloudflare anycast — YemenNet path OK.",
      });
    } catch (e) {
      out.push({ key: "dns-muslly", label: "DNS — muslly.com", status: "fail", detail: String(e) });
    }

    // 2. DNS ympharma.lovable.app (reference baseline)
    try {
      const [a, aaaa] = await Promise.all([
        doh("ympharma.lovable.app", "A"),
        doh("ympharma.lovable.app", "AAAA"),
      ]);
      out.push({
        key: "dns-ympharma",
        label: "DNS — ympharma.lovable.app (baseline)",
        status: a.length > 0 ? "ok" : "fail",
        detail: `A=${a.join(", ")} | AAAA=${aaaa.join(", ") || "none"}`,
        hint: "Reference: multi-A + IPv6 = the cluster known to work on YemenNet.",
      });
    } catch (e) {
      out.push({ key: "dns-ympharma", label: "DNS — ympharma.lovable.app", status: "fail", detail: String(e) });
    }

    // 3. HTTPS reachability — muslly.com health
    {
      const r = await timedHead("https://muslly.com/api/public/health?from=netdash");
      out.push({
        key: "https-muslly",
        label: "HTTPS — muslly.com /api/public/health",
        status: r.ok ? "ok" : "fail",
        detail: `HTTP ${r.status} in ${r.ms} ms`,
        latencyMs: r.ms,
        hint: r.ok ? "Reachable from this client." : "Origin unreachable from this client / network.",
      });
    }

    // 4. HTTPS reachability — ympharma baseline
    {
      const r = await timedHead("https://ympharma.lovable.app/api/public/health?from=netdash");
      out.push({
        key: "https-ympharma",
        label: "HTTPS — ympharma.lovable.app /api/public/health",
        status: r.ok ? "ok" : "fail",
        detail: `HTTP ${r.status} in ${r.ms} ms`,
        latencyMs: r.ms,
      });
    }

    // 5. Cloudflare edge trace
    {
      const start = performance.now();
      try {
        const r = await fetch("https://muslly.com/cdn-cgi/trace", { cache: "no-store" });
        const t = await r.text();
        const ms = Math.round(performance.now() - start);
        const colo = /colo=([A-Z]{3})/.exec(t)?.[1];
        const loc = /loc=([A-Z]{2})/.exec(t)?.[1];
        out.push({
          key: "edge",
          label: "Cloudflare edge trace",
          status: r.ok ? "ok" : "warn",
          detail: `colo=${colo ?? "?"} loc=${loc ?? "?"} in ${ms} ms`,
          latencyMs: ms,
          hint:
            colo === "CDG" || colo === "FRA" || colo === "MRS"
              ? `Served from ${colo} — for YemenNet expect DXB/BAH/CAI when properly proxied.`
              : undefined,
        });
      } catch (e) {
        out.push({ key: "edge", label: "Cloudflare edge trace", status: "fail", detail: String(e) });
      }
    }

    // 6. Supabase reachability
    if (SUPABASE_URL) {
      const r = await timedHead(`${SUPABASE_URL}/auth/v1/health`);
      out.push({
        key: "supabase",
        label: "Lovable Cloud (backend) health",
        status: r.ok || r.status === 404 ? "ok" : "fail",
        detail: `HTTP ${r.status} in ${r.ms} ms`,
        latencyMs: r.ms,
      });
    }

    setRows(out);
    setRanAt(new Date().toLocaleString());
    setRunning(false);
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(() => { if (document.visibilityState === "hidden") return; run(); }, 60_000);
    return () => clearInterval(id);
  }, [run]);

  const overall: Status = rows.length === 0
    ? "pending"
    : rows.some((r) => r.status === "fail")
      ? "fail"
      : rows.some((r) => r.status === "warn")
        ? "warn"
        : "ok";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Network Operations — muslly.com</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Live probes from this device. Auto-refresh every 60 s.{" "}
          {ranAt ? <span>Last run: {ranAt}.</span> : null}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <StatusDot s={overall} />
          <span className="text-sm font-medium">
            Overall:{" "}
            {overall === "ok"
              ? "All green"
              : overall === "warn"
                ? "Degraded"
                : overall === "fail"
                  ? "NO-GO for YemenNet"
                  : "Running…"}
          </span>
          <button
            onClick={run}
            disabled={running}
            className="ml-auto rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {running ? "Running…" : "Re-run now"}
          </button>
        </div>
      </header>

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {rows.map((r) => (
          <li key={r.key} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusDot s={r.status} />
              <span className="font-medium">{r.label}</span>
              {typeof r.latencyMs === "number" && (
                <span className="ml-auto text-xs text-zinc-500">{r.latencyMs} ms</span>
              )}
            </div>
            <p className="mt-1 break-words text-xs text-zinc-600">{r.detail}</p>
            {r.hint && <p className="mt-1 text-xs text-zinc-500">↳ {r.hint}</p>}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">Running probes…</li>
        )}
      </ul>

      <footer className="mt-6 text-xs text-zinc-500">
        Full audit & remediation runbook:{" "}
        <code>docs/yemen-infra-audit.md</code> · <code>docs/cloudflare-setup.md</code>
      </footer>
    </div>
  );
}
