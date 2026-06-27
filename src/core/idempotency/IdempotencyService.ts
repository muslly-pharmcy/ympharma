// ============================================================
// IdempotencyService — منع المعالجة المكررة للـ webhooks والـ hooks
// ============================================================
// • يعتمد Web Crypto (globalThis.crypto.subtle) — متوافق Cloudflare Workers
//   بدون الحاجة لـ node:crypto.
// • يستخدم supabaseAdmin بـ dynamic import حصرًا داخل الميثود حتى لا
//   يُسرَّب الملف إلى bundle العميل.
// • TTL افتراضي: 24 ساعة. cron يومي يستدعي cleanup_idempotency_keys().
//
// الاستخدام داخل server-route handler:
//
//   const idem = await IdempotencyService.check({ scope, key });
//   if (idem.cached) return idem.cached;
//   ...
//   await IdempotencyService.store({ scope, key, status, body });

export type CachedResponse = { status: number; body: unknown };

export type IdempotencyCheck =
  | { cached: null; conflict: false }
  | { cached: Response; conflict: false }
  | { cached: null; conflict: true; message: string };

export interface IdempotencyStoreParams {
  scope: string;
  key: string;
  status: number;
  body: unknown;
  requestHash?: string;
  ttlSeconds?: number;
}

export interface IdempotencyCheckParams {
  scope: string;
  key: string;
  requestHash?: string;
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SubtleCrypto unavailable in this runtime");
  return subtle;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await getSubtle().digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class IdempotencyService {
  static async check(params: IdempotencyCheckParams): Promise<IdempotencyCheck> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("idempotency_keys")
      .select("response_status, response_body, request_hash, expires_at")
      .eq("scope", params.scope)
      .eq("key", params.key)
      .maybeSingle();

    if (error || !data) return { cached: null, conflict: false };
    if (new Date(data.expires_at).getTime() < Date.now()) {
      return { cached: null, conflict: false };
    }
    if (
      params.requestHash &&
      data.request_hash &&
      params.requestHash !== data.request_hash
    ) {
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

  static async store(params: IdempotencyStoreParams): Promise<void> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ttl = params.ttlSeconds ?? 24 * 60 * 60;
    const expires = new Date(Date.now() + ttl * 1000).toISOString();
    await supabaseAdmin.from("idempotency_keys").upsert(
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

  static sha256Hex = sha256Hex;
}

// Legacy named-export facade — keeps src/lib/idempotency.server.ts shim trivial.
export const checkIdempotency = IdempotencyService.check.bind(IdempotencyService);
export const storeIdempotency = IdempotencyService.store.bind(IdempotencyService);
