// Publish a saved social_posts row by forwarding it to the configured n8n webhook.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface PostRow {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[] | null;
  cta: string | null;
  product_id: string | null;
}

export async function publishToN8n(post: PostRow): Promise<{ ok: true; external_id?: string }> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) throw new Error("N8N_WEBHOOK_URL غير مضبوط");

  const hashtags = post.hashtags ?? [];
  const fullCaption = hashtags.length
    ? `${post.caption}\n\n${hashtags.join(" ")}`
    : post.caption;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: post.id,
        platform: post.platform,
        caption: fullCaption,
        cta: post.cta,
        product_id: post.product_id,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`n8n HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = (await res.json().catch(() => ({}))) as { external_id?: string; id?: string };
    return { ok: true, external_id: body.external_id ?? body.id };
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

export async function publishPostById(postId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("social_posts")
    .select("id,platform,caption,hashtags,cta,product_id")
    .eq("id", postId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "post not found" };
  }
  try {
    const r = await publishToN8n(data as PostRow);
    await markPublished(postId, r.external_id);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    await markFailed(postId, msg);
    return { ok: false, error: msg };
  }
}
