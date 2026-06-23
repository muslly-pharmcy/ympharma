// Inbound callback from n8n.
// Auth: HMAC-SHA256 in `x-n8n-signature` over the RAW body, secret = N8N_CALLBACK_SECRET.
// Idempotent by (post_id, event, external_id).
//
// Accepted payloads:
//   { event: "published", post_id, external_id, platform? }
//   { event: "failed",    post_id, error, platform? }
//   { event: "stats",     post_id, external_id?, likes?, comments?, shares?, views? }
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nSignature } from "@/lib/n8n-callback-auth.server";

const payloadSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("published"),
    post_id: z.string().uuid(),
    external_id: z.string().min(1).max(200),
    platform: z.string().max(40).optional(),
  }),
  z.object({
    event: z.literal("failed"),
    post_id: z.string().uuid(),
    error: z.string().max(2000).default("n8n reported failure"),
    platform: z.string().max(40).optional(),
  }),
  z.object({
    event: z.literal("stats"),
    post_id: z.string().uuid(),
    external_id: z.string().max(200).optional(),
    likes: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    shares: z.number().int().nonnegative().optional(),
    views: z.number().int().nonnegative().optional(),
  }),
]);

export const Route = createFileRoute("/api/public/hooks/social-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verifyN8nSignature(raw, request.headers.get("x-n8n-signature"))) {
          return new Response(JSON.stringify({ ok: false, error: "invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: z.infer<typeof payloadSchema>;
        try {
          body = payloadSchema.parse(JSON.parse(raw));
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: "invalid payload", detail: (e as Error).message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Confirm the post exists (prevents writing rows for unknown post_ids)
          const { data: post, error: postErr } = await supabaseAdmin
            .from("social_posts")
            .select("id,status,external_id,attempt_count")
            .eq("id", body.post_id)
            .maybeSingle();
          if (postErr) throw new Error(postErr.message);
          if (!post) {
            return new Response(JSON.stringify({ ok: false, error: "post not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (body.event === "published") {
            // Idempotency: if already published with the same external_id, skip.
            if (post.status === "published" && post.external_id === body.external_id) {
              return Response.json({ ok: true, idempotent: true });
            }
            await supabaseAdmin
              .from("social_posts")
              .update({
                status: "published",
                external_id: body.external_id,
                published_at: new Date().toISOString(),
                error_message: null,
              })
              .eq("id", body.post_id);
            await supabaseAdmin.from("social_post_attempts").insert({
              post_id: body.post_id,
              attempt_no: post.attempt_count ?? 0,
              status: "success",
              external_id: body.external_id,
              source: "callback",
            });
            return Response.json({ ok: true });
          }

          if (body.event === "failed") {
            await supabaseAdmin
              .from("social_posts")
              .update({ status: "failed", error_message: body.error.slice(0, 1000) })
              .eq("id", body.post_id);
            await supabaseAdmin.from("social_post_attempts").insert({
              post_id: body.post_id,
              attempt_no: post.attempt_count ?? 0,
              status: "failed",
              error_message: body.error.slice(0, 1000),
              source: "callback",
            });
            return Response.json({ ok: true });
          }

          // event === "stats" — upsert by unique(post_id)
          const { error: statsErr } = await supabaseAdmin
            .from("social_post_stats")
            .upsert(
              {
                post_id: body.post_id,
                likes: body.likes ?? 0,
                comments: body.comments ?? 0,
                shares: body.shares ?? 0,
                views: body.views ?? 0,
                collected_at: new Date().toISOString(),
              },
              { onConflict: "post_id" },
            );
          if (statsErr) throw new Error(statsErr.message);
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[social-callback]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
