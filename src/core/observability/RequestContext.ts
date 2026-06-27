// ============================================================
// RequestContext — W3C trace + correlation propagation
// ============================================================
// • Worker-safe: uses Web Crypto only (globalThis.crypto.randomUUID()).
// • Parses inbound traceparent: 00-<trace-id:32hex>-<span-id:16hex>-<flags:2hex>.
// • Generates a fresh child span id; preserves the inbound trace id when present.

const TRACEPARENT_RE =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export interface RequestContext {
  correlation_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  trace_flags: string;
  tracestate: string | null;
  traceparent: string;
}

function rand(bytes: number): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newUuid(): string {
  return globalThis.crypto.randomUUID?.() ??
    `${rand(4)}-${rand(2)}-${rand(2)}-${rand(2)}-${rand(6)}`;
}

export function buildRequestContext(request: Request): RequestContext {
  const incoming = request.headers.get("traceparent");
  const tracestate = request.headers.get("tracestate");
  const correlation_id =
    request.headers.get("x-correlation-id") ?? newUuid();

  let trace_id: string;
  let parent_span_id: string | null = null;
  let trace_flags = "01";

  const m = incoming ? TRACEPARENT_RE.exec(incoming.trim()) : null;
  if (m) {
    trace_id = m[2].toLowerCase();
    parent_span_id = m[3].toLowerCase();
    trace_flags = m[4].toLowerCase();
  } else {
    trace_id = rand(16);
  }
  const span_id = rand(8);
  const traceparent = `00-${trace_id}-${span_id}-${trace_flags}`;

  return {
    correlation_id,
    trace_id,
    span_id,
    parent_span_id,
    trace_flags,
    tracestate,
    traceparent,
  };
}
