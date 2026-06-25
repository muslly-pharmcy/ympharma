import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-error-explainer")({
  component: ErrorExplainerPage,
});

type Severity = "info" | "warning" | "critical";
type Catalog = {
  pattern: RegExp;
  title: string;
  severity: Severity;
  source: string;
  cause: string;
  actions: string[];
};

const CATALOG: Catalog[] = [
  {
    pattern: /no providers available/i,
    title: "Build sandbox: no providers available",
    severity: "warning",
    source: "Lovable build orchestrator (gRPC multiplexer)",
    cause:
      "Lovable couldn't allocate a build-run Worker. This is infrastructure-side and transient — your code is fine.",
    actions: [
      "Wait 30–60 seconds and retry the build.",
      "If it persists >5 minutes, check status.lovable.dev.",
      "No code change required.",
    ],
  },
  {
    pattern: /acquire build-run sandbox/i,
    title: "Build sandbox acquisition failed",
    severity: "warning",
    source: "Lovable build pipeline",
    cause: "The build couldn't reserve a sandbox before the timeout window.",
    actions: ["Retry the build.", "Restart the dev server from the toolbar if preview is wedged."],
  },
  {
    pattern: /Unauthorized: No authorization header/i,
    title: "Server function called without bearer token",
    severity: "critical",
    source: "requireSupabaseAuth middleware",
    cause:
      "Client did not attach the Supabase access token. Usually means functionMiddleware in src/start.ts is missing attachSupabaseAuth.",
    actions: [
      "Verify src/start.ts registers attachSupabaseAuth in functionMiddleware.",
      "Confirm the user is signed in before the call.",
    ],
  },
  {
    pattern: /\[unenv\].+not implemented/i,
    title: "Node API not supported in Worker runtime",
    severity: "critical",
    source: "Cloudflare Workers + unenv",
    cause:
      "Server function tried to use a Node-only API (child_process, fs.watch, native binary).",
    actions: [
      "Swap the package for a Worker-compatible alternative.",
      "Call an external HTTP API instead.",
    ],
  },
  {
    pattern: /permission denied for (table|schema|relation)/i,
    title: "Missing GRANT on a public table",
    severity: "critical",
    source: "PostgREST / Supabase Data API",
    cause: "Table exists with RLS enabled but no GRANT to authenticated/anon/service_role.",
    actions: [
      "Add `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;`",
      "Add `GRANT ALL ON public.<table> TO service_role;`",
      "Re-check policies match the granted roles.",
    ],
  },
  {
    pattern: /Expected 3 parts in JWT/i,
    title: "supabaseAdmin used for Data API read",
    severity: "warning",
    source: "supabase-js + sb_secret_ key format",
    cause:
      "supabaseAdmin received a non-JWT secret. Use the publishable client for ordinary reads.",
    actions: ["Switch to the per-request authenticated client from requireSupabaseAuth context."],
  },
  {
    pattern: /no providers available|Unavailable.+grpc/i,
    title: "Transient gRPC unavailability",
    severity: "info",
    source: "Lovable internal gRPC",
    cause: "Upstream service briefly unavailable.",
    actions: ["Retry. Persistent failures: contact Lovable support."],
  },
];

function classify(input: string): Catalog | null {
  return CATALOG.find((c) => c.pattern.test(input)) ?? null;
}

type HealthResp = {
  overall_status: string;
  checks: Record<string, { status: string; [k: string]: unknown }>;
  timestamp: string;
};

function ErrorExplainerPage() {
  const [input, setInput] = useState("");
  const [health, setHealth] = useState<HealthResp | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/public/monitoring/health");
      setHealth(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const match = input.trim() ? classify(input) : null;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Error Explainer & App Health</h1>
        <p className="text-muted-foreground mt-1">
          Paste any build or runtime error to get plain-language guidance.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">App health snapshot</h2>
          <Button size="sm" variant="outline" onClick={loadHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="col-span-full flex items-center gap-2">
              <span className="text-sm font-medium">Overall:</span>
              <Badge
                variant={health.overall_status === "ok" ? "default" : "destructive"}
              >
                {health.overall_status}
              </Badge>
              <span className="text-xs text-muted-foreground">{health.timestamp}</span>
            </div>
            {Object.entries(health.checks).map(([k, v]) => (
              <div key={k} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono">{k}</span>
                  <Badge variant={v.status === "ok" ? "secondary" : "destructive"}>
                    {v.status}
                  </Badge>
                </div>
                <pre className="text-[10px] text-muted-foreground overflow-x-auto">
                  {JSON.stringify(v, null, 0)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Paste an error message</h2>
        <textarea
          className="w-full h-32 p-2 border rounded font-mono text-sm bg-background"
          placeholder="e.g. acquire build-run sandbox via multiplexer grpc: no providers available"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {input.trim() && (
          match ? (
            <div className="border rounded p-4 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                {match.severity === "critical" ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : match.severity === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                )}
                <h3 className="font-semibold">{match.title}</h3>
                <Badge variant="outline">{match.severity}</Badge>
              </div>
              <p className="text-sm"><strong>Source:</strong> {match.source}</p>
              <p className="text-sm"><strong>Cause:</strong> {match.cause}</p>
              <div>
                <p className="text-sm font-semibold mb-1">Next steps:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {match.actions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No catalog match. This may be an app-specific error — check the route, server function, or DB query that produced it.
            </p>
          )
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold">Known catalog ({CATALOG.length})</h2>
        <div className="space-y-1 text-sm">
          {CATALOG.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">{c.severity}</Badge>
              <span>{c.title}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2">
        <Link to="/admin-system-health"><Button variant="outline">System health</Button></Link>
        <a href="https://status.lovable.dev" target="_blank" rel="noreferrer">
          <Button variant="outline">
            Lovable status <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </a>
      </div>
    </div>
  );
}
