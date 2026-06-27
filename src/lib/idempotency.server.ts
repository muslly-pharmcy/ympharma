// Idempotency helper for /api/public/hooks/* and webhooks.
// Usage inside a server-route handler:
//
//   const idem = await checkIdempotency({ scope: "n8n-callback", key });
//   if (idem.cached) return idem.cached;          // replay previous response
//   const res = await doWork();
//   await storeIdempotency({ scope, key, status: res.status, body: payload });
//   return res;
//
// Notes:
//   - Uses supabaseAdmin (RLS bypass) — handlers are already authenticated
//     by signature/secret.
//   - 24h TTL by default; cleanup_idempotency_keys() purges expired rows daily.
//   - request_hash optional: pass a SHA-256 of the canonical body so a re-use
//     of the same Idempotency-Key with a *different* body is rejected (Stripe).

import { webcrypto } from "node:crypto";

const subtle = (globalThis.crypto?.subtle ?? webcrypto.subtle) as SubtleCrypto;

export async function sha256Hex(input: string): Promise<string> {
  const buf = await subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type CachedResponse = {
  status: number;
  body: unknown;
};

export type IdempotencyCheck =
  | { cached: null; conflict: false }
  | { cached: Response; conflict: false }
  | { cached: null; conflict: true; message: string };

export async function checkIdempotency(params: {
  scope: string;
  key: string;
  requestHash?: string;
}): Promise<IdempotencyCheck> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("idempotency_keys")
    .select("response_status, response_body, request_hash, expires_at")
    .eq("scope", params.scope)
    .eq("key", params.key)
    .maybeSingle();

  if (error) {
    // Fail-open: treat as cache-miss. Better to risk a duplicate than block a webhook.
    return { cached: null, conflict: false };
  }
  if (!data) return { cached: null, conflict: false };

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { cached: null, conflict: false };
  }

  if (params.requestHash && data.request_hash && params.requestHash !== data.request_hash) {
    return {
      cached: null,
      conflict: true,
      message: "Idempotency-Key reused with a different request body",
    };
  }

  const body = data.response_body ?? null;
  const res = new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: data.response_status ?? 200,
    headers: {
      "content-type": "application/json",
      "idempotency-status": "replayed",
    },
  });
  return { cached: res, conflict: false };
}

export async function storeIdempotency(params: {
  scope: string;
  key: string;
  status: number;
  body: unknown;
  requestHash?: string;
  ttlSeconds?: number;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ttl = params.ttlSeconds ?? 24 * 60 * 60;
  const expires = new Date(Date.now() + ttl * 1000).toISOString();
  await supabaseAdmin
    .from("idempotency_keys")
    .upsert(
      {
        scope: params.scope,
        key: params.key,
        request_hash: params.requestHash ?? null,
        response_status: params.status,
        response_body: params.body as never,
        expires_at: expires,
      },
      { onConflict: "scope,key" },
    );
}
