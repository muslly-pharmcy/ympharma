// Publish a saved social_posts row by forwarding it to the configured n8n webhook.
// Every attempt is recorded in `social_post_attempts` with full diagnostics
// (request payload, response status, response body) for debugging.
// Outbound requests are signed with HMAC-SHA256 over the raw JSON body using
// N8N_CALLBACK_SECRET, sent in the `x-lovable-signature` header so n8n can verify.
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface PostRow {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[] | null;
  cta: string | null;
  product_id: string | null;
}

type AttemptSource = "server" | "callback" | "manual" | "cron";

async function logAttempt(args: {
  postId: string;
  attemptNo: number;
  status: "success" | "failed" | "skipped";
  error?: string | null;
  externalId?: string | null;
  source: AttemptSource;
  requestPayload?: unknown;
  responseStatus?: number | null;
  responseBody?: string | null;
  hmacValid?: boolean | null;
  idempotentSkip?: boolean;
}) {
  await supabaseAdmin.from("social_post_attempts").insert({
    post_id: args.postId,
    attempt_no: args.attemptNo,
    status: args.status,
    error_message: args.error?.slice(0, 1000) ?? null,
    external_id: args.externalId ?? null,
    source: args.source,
    request_payload: (args.requestPayload ?? null) as any,
    response_status: args.responseStatus ?? null,
    response_body: args.responseBody?.slice(0, 1000) ?? null,
    hmac_valid: args.hmacValid ?? null,
    idempotent_skip: args.idempotentSkip ?? false,
  });
}

async function bumpAttempt(postId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("social_posts")
    .select("attempt_count")
    .eq("id", postId)
    .maybeSingle();
  const next = (data?.attempt_count ?? 0) + 1;
  await supabaseAdmin
    .from("social_posts")
    .update({ attempt_count: next, last_attempt_at: new Date().toISOString() })
    .eq("id", postId);
  return next;
}

interface PublishResult {
  ok: true;
  external_id?: string;
  payload: Record<string, unknown>;
  responseStatus: number;
  responseBody: string;
}

interface PublishError extends Error {
  payload?: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
}

export async function publishToN8n(post: PostRow): Promise<PublishResult> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) throw new Error("N8N_WEBHOOK_URL غير مضبوط");

  const hashtags = post.hashtags ?? [];
  const fullCaption = hashtags.length
    ? `${post.caption}\n\n${hashtags.join(" ")}`
    : post.caption;

  const payload: Record<string, unknown> = {
    event: "publish",
    post_id: post.id,
    platform: post.platform,
    caption: fullCaption,
    cta: post.cta,
    product_id: post.product_id,
  };

  const rawBody = JSON.stringify(payload);
  const secret = process.env.N8N_CALLBACK_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    const sig = createHmac("sha256", secret).update(rawBody).digest("hex");
    headers["x-lovable-signature"] = `sha256=${sig}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const err: PublishError = new Error(`n8n HTTP ${res.status}: ${text.slice(0, 300)}`);
      err.payload = payload;
      err.responseStatus = res.status;
      err.responseBody = text;
      throw err;
    }
    let parsed: { external_id?: string; id?: string } = {};
    try {
      parsed = JSON.parse(text) as { external_id?: string; id?: string };
    } catch {
      // not JSON — that's fine
    }
    return {
      ok: true,
      external_id: parsed.external_id ?? parsed.id,
      payload,
      responseStatus: res.status,
      responseBody: text,
    };
  } catch (e) {
    if ((e as PublishError).payload) throw e;
    const err: PublishError = new Error((e as Error).message);
    err.payload = payload;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function markPublished(postId: string, externalId?: string) {
  await supabaseAdmin
    .from("social_posts")
    .update({
      status: "published",
      external_id: externalId ?? null,
      published_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", postId);
}

export async function markFailed(postId: string, error: string) {
  await supabaseAdmin
    .from("social_posts")
    .update({
      status: "failed",
      error_message: error.slice(0, 1000),
    })
    .eq("id", postId);
}

export async function publishPostById(
  postId: string,
  source: AttemptSource = "server",
): Promise<{ ok: boolean; error?: string; attempt_no?: number; idempotent?: boolean }> {
  const { data, error } = await supabaseAdmin
    .from("social_posts")
    .select("id,platform,caption,hashtags,cta,product_id,status,external_id")
    .eq("id", postId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "post not found" };
  }

  // Idempotency: if already published with an external_id, skip re-sending.
  if (data.status === "published" && data.external_id) {
    const attemptNo = await bumpAttempt(postId);
    await logAttempt({
      postId,
      attemptNo,
      status: "skipped",
      source,
      idempotentSkip: true,
      error: `سبق نشره external_id=${data.external_id}`,
      externalId: data.external_id,
    });
    return { ok: true, idempotent: true, attempt_no: attemptNo };
  }

  const attemptNo = await bumpAttempt(postId);
  try {
    const r = await publishToN8n(data as PostRow);
    await markPublished(postId, r.external_id);
    await logAttempt({
      postId,
      attemptNo,
      status: "success",
      externalId: r.external_id ?? null,
      source,
      requestPayload: r.payload,
      responseStatus: r.responseStatus,
      responseBody: r.responseBody,
    });
    return { ok: true, attempt_no: attemptNo };
  } catch (e) {
    const err = e as PublishError;
    const msg = err.message;
    await markFailed(postId, msg);
    await logAttempt({
      postId,
      attemptNo,
      status: "failed",
      error: msg,
      source,
      requestPayload: err.payload,
      responseStatus: err.responseStatus ?? null,
      responseBody: err.responseBody ?? null,
    });
    return { ok: false, error: msg, attempt_no: attemptNo };
  }
}
