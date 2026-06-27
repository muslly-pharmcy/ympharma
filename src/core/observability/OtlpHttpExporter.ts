// ============================================================
// OtlpHttpExporter — minimal OTLP/HTTP span exporter (fetch-based)
// ============================================================
// • Pure fetch; no @opentelemetry/sdk-node (Node-only on Workers).
// • Gated by env: OTEL_EXPORTER_OTLP_ENDPOINT (+ optional OTEL_EXPORTER_OTLP_HEADERS).
// • Best-effort: failures are swallowed, never throw into the request path.

import type { RequestContext } from "./RequestContext";

export interface SpanEnd {
  ctx: RequestContext;
  name: string;
  start_ms: number;
  end_ms: number;
  status_code: number;
  attributes?: Record<string, string | number | boolean>;
}

function parseHeaders(): Record<string, string> {
  const raw = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

export async function exportSpan(s: SpanEnd): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  const serviceName = process.env.OTEL_SERVICE_NAME ?? "ympharma";
  const attrs = Object.entries(s.attributes ?? {}).map(([k, v]) => ({
    key: k,
    value: typeof v === "string" ? { stringValue: v }
      : typeof v === "number" ? { intValue: Math.round(v) }
      : { boolValue: Boolean(v) },
  }));

  const body = {
    resourceSpans: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: serviceName } }] },
      scopeSpans: [{
        scope: { name: "ympharma/observability" },
        spans: [{
          traceId: s.ctx.trace_id,
          spanId: s.ctx.span_id,
          parentSpanId: s.ctx.parent_span_id ?? undefined,
          name: s.name,
          kind: 2, // SERVER
          startTimeUnixNano: String(BigInt(s.start_ms) * 1_000_000n),
          endTimeUnixNano: String(BigInt(s.end_ms) * 1_000_000n),
          attributes: attrs,
          status: { code: s.status_code >= 500 ? 2 : 1 },
        }],
      }],
    }],
  };

  try {
    await fetch(endpoint.replace(/\/$/, "") + "/v1/traces", {
      method: "POST",
      headers: { "content-type": "application/json", ...parseHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    // swallow — never break the request on telemetry failure
  }
}
