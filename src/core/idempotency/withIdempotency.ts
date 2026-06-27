// ============================================================
// withIdempotency — decorator يلفّ server-route handler ويضمن idempotency
// ============================================================
// الاستخدام:
//
//   export const Route = createFileRoute("/api/public/hooks/x")({
//     server: {
//       handlers: {
//         POST: withIdempotency({ scope: "x", keyHeader: "idempotency-key" })(
//           async ({ request }) => {
//             const body = await request.json();
//             // ... do work
//             return new Response(JSON.stringify({ ok: true }), { status: 200 });
//           }
//         ),
//       },
//     },
//   });
//
// السلوك:
//   • إذا لم يحضر العميل header → ينفّذ الـ handler عاديًا بدون idempotency.
//   • إذا حضر مفتاح مسبق → يُعيد الاستجابة المخزّنة (replay).
//   • إذا حضر نفس المفتاح بـ body مختلف → 409 conflict.

import { IdempotencyService, sha256Hex } from "./IdempotencyService";

type RouteHandler = (ctx: { request: Request }) => Promise<Response> | Response;

export interface WithIdempotencyOptions {
  scope: string;
  keyHeader?: string;
  ttlSeconds?: number;
  hashBody?: boolean;
}

export function withIdempotency(opts: WithIdempotencyOptions) {
  const keyHeader = opts.keyHeader ?? "idempotency-key";
  return (handler: RouteHandler): RouteHandler => {
    return async (ctx) => {
      const key = ctx.request.headers.get(keyHeader);
      if (!key) return handler(ctx);

      let bodyText: string | null = null;
      let requestHash: string | undefined;
      if (opts.hashBody) {
        bodyText = await ctx.request.clone().text();
        requestHash = await sha256Hex(bodyText);
      }

      const check = await IdempotencyService.check({
        scope: opts.scope,
        key,
        requestHash,
      });
      if (check.conflict) {
        return new Response(
          JSON.stringify({ error: check.message }),
          { status: 409, headers: { "content-type": "application/json" } },
        );
      }
      if (check.cached) return check.cached;

      const res = await handler(ctx);
      try {
        const cloned = res.clone();
        const text = await cloned.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* keep as string */
        }
        await IdempotencyService.store({
          scope: opts.scope,
          key,
          status: res.status,
          body: parsed,
          requestHash,
          ttlSeconds: opts.ttlSeconds,
        });
      } catch {
        // fail-open: don't block the response on a cache write failure
      }
      return res;
    };
  };
}
