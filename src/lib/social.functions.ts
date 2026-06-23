// Client-callable server functions for the admin social posts dashboard.
// All mutations require an authenticated admin/owner caller.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "owner"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const listSocialPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(100).default(30),
      status: z.enum(["pending", "published", "failed"]).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("social_posts")
      .select("id,platform,product_id,caption,hashtags,cta,status,external_id,error_message,scheduled_for,published_at,created_at,attempt_count,last_attempt_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPostAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("social_post_attempts")
      .select("id,attempt_no,status,error_message,external_id,source,created_at,request_payload,response_status,response_body,hmac_valid,idempotent_skip")
      .eq("post_id", data.post_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPostStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("social_post_stats")
      .select("likes,comments,shares,views,collected_at")
      .eq("post_id", data.post_id)
      .maybeSingle();
    return row;
  });

export const regenerateDailyPostsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { generateDailyDrafts } = await import("./social-content.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const drafts = await generateDailyDrafts();
    if (drafts.length === 0) {
      return { ok: true, inserted: 0 };
    }
    const { error } = await supabaseAdmin.from("social_posts").insert(drafts);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: drafts.length };
  });

export const publishPostNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { publishPostById } = await import("./social-publisher.server");
    return publishPostById(data.id);
  });

export const deleteSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("social_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Smoke test: ping the configured n8n webhook with a no-op payload and report
// the HTTP status + response body + duration. Admin-only.
export const pingN8nWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
      return {
        ok: false,
        status: 0,
        url: null as string | null,
        body: "",
        errorDetail: "N8N_WEBHOOK_URL غير مضبوط في الإعدادات",
        durationMs: 0,
      };
    }
    const payload = {
      event: "ping",
      post_id: "ping-test",
      platform: "telegram",
      caption: "ping من Lovable",
    };
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    const startedAt = Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = (await res.text().catch(() => "")).slice(0, 1500);
      const durationMs = Date.now() - startedAt;
      return {
        ok: res.ok,
        status: res.status,
        url,
        body: text,
        errorDetail: res.ok ? null : `n8n استجاب بـ HTTP ${res.status}`,
        durationMs,
        payload,
      };
    } catch (e) {
      const durationMs = Date.now() - startedAt;
      const err = e as Error;
      return {
        ok: false,
        status: 0,
        url,
        body: "",
        errorDetail: `${err.name}: ${err.message}`,
        durationMs,
        payload,
      };
    } finally {
      clearTimeout(t);
    }
  });
