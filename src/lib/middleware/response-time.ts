// QOS-P3-002 — Wrap a route handler to record its response time.
// Usage inside a server route handler:
//   GET: withResponseTime("/api/public/health", async ({ request }) => { ... })
import { recordApiSample } from "@/lib/monitoring/api-monitor";

type Handler = (ctx: { request: Request; params?: unknown; context?: unknown }) => Promise<Response>;

export function withResponseTime(route: string, handler: Handler): Handler {
  return async (ctx) => {
    const start = Date.now();
    let ok = true;
    try {
      const res = await handler(ctx);
      ok = res.status < 500;
      return res;
    } catch (err) {
      ok = false;
      throw err;
    } finally {
      recordApiSample(route, Date.now() - start, ok);
    }
  };
}
