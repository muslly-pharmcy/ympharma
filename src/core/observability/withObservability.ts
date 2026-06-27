// ============================================================
// withObservability — server-route wrapper for trace + correlation
// ============================================================
// Usage inside a TSS server route handler:
//
//   POST: withObservability("hooks.backup-verify", async ({ request, ctx }) => {
//     return Response.json({ ok: true });
//   })

import { buildRequestContext, type RequestContext } from "./RequestContext";
import { logger } from "./Logger";
import { exportSpan } from "./OtlpHttpExporter";

type RouteCtx = { request: Request };
type ObservedHandler = (
  ctx: RouteCtx & { ctx: RequestContext },
) => Promise<Response> | Response;

export function withObservability(name: string, handler: ObservedHandler) {
  return async (rctx: RouteCtx): Promise<Response> => {
    const ctx = buildRequestContext(rctx.request);
    const start = Date.now();
    const log = logger.withContext(ctx);
    const url = new URL(rctx.request.url);
    log.info("request.start", { route: name, method: rctx.request.method, path: url.pathname });

    let res: Response;
    let status = 500;
    try {
      res = await handler({ ...rctx, ctx });
      status = res.status;
    } catch (e) {
      log.error("request.error", {
        route: name,
        err: e instanceof Error ? e.message : String(e),
      });
      res = new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
      status = 500;
    }

    // Decorate response with correlation + trace headers
    const out = new Response(res.body, res);
    out.headers.set("x-correlation-id", ctx.correlation_id);
    out.headers.set("traceparent", ctx.traceparent);
    if (ctx.tracestate) out.headers.set("tracestate", ctx.tracestate);

    const end = Date.now();
    log.info("request.end", {
      route: name,
      status,
      duration_ms: end - start,
    });

    // Fire-and-forget OTLP export
    void exportSpan({
      ctx,
      name,
      start_ms: start,
      end_ms: end,
      status_code: status,
      attributes: {
        "http.method": rctx.request.method,
        "http.route": name,
        "http.status_code": status,
        "url.path": url.pathname,
      },
    });

    return out;
  };
}
