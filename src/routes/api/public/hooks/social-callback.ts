// Inbound callback from n8n.
// Auth: HMAC-SHA256 in `x-n8n-signature` over the RAW body, secret = N8N_CALLBACK_SECRET.
// Idempotent by (post_id, event, external_id).
// All callbacks (including rejected ones) are logged into social_post_attempts
// for diagnostics, with the raw payload, HMAC verdict, and idempotent_skip flag.
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

async function logCallbackAttempt(args: {
  postId: string;
  attemptNo: number;
  status: "success" | "failed" | "skipped";
  error?: string | null;
  externalId?: string | null;
  requestPayload: unknown;
  hmacValid: boolean;
  idempotentSkip?: boolean;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("social_post_attempts").insert({
      post_id: args.postId,
      attempt_no: args.attemptNo,
      status: args.status,
      error_message: args.error?.slice(0, 1000) ?? null,
      external_id: args.externalId ?? null,
      source: "callback",
      request_payload: args.requestPayload as any,
      hmac_valid: args.hmacValid,
      idempotent_skip: args.idempotentSkip ?? false,
    });
  } catch (e) {
    console.error("[social-callback] logCallbackAttempt failed", e);
  }
}

export const Route = createFileRoute("/api/public/hooks/social-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sigHeader = request.headers.get("x-n8n-signature");
        const hmacValid = verifyN8nSignature(raw, sigHeader);

        if (!hmacValid) {
          // Try to extract post_id for logging even on rejection
          let postIdForLog: string | null = null;
          let parsedPayload: unknown = raw.slice(0, 1000);
          try {
            const parsed = JSON.parse(raw);
            parsedPayload = parsed;
            if (typeof parsed?.post_id === "string") postIdForLog = parsed.post_id;
          } catch {
            // not JSON
          }
          console.warn(
            `[social-callback] REJECTED hmac=fail post_id=${postIdForLog ?? "?"} sig=${sigHeader ? "present" : "missing"}`,
          );
          if (postIdForLog) {
            await logCallbackAttempt({
              postId: postIdForLog,
              attemptNo: 0,
              status: "failed",
              error: `HMAC غير صحيح (signature=${sigHeader ? "present" : "missing"})`,
              requestPayload: parsedPayload,
              hmacValid: false,
            });
          }
          return new Response(JSON.stringify({ ok: false, error: "invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: z.infer<typeof payloadSchema>;
        let rawParsed: unknown;
        try {
          rawParsed = JSON.parse(raw);
          body = payloadSchema.parse(rawParsed);
        } catch (e) {
          console.warn("[social-callback] invalid payload", (e as Error).message);
          return new Response(
            JSON.stringify({ ok: false, error: "invalid payload", detail: (e as Error).message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: post, error: postErr } = await supabaseAdmin
            .from("social_posts")
            .select("id,status,external_id,attempt_count")
            .eq("id", body.post_id)
            .maybeSingle();
          if (postErr) throw new Error(postErr.message);
          if (!post) {
            console.warn(`[social-callback] post not found post_id=${body.post_id}`);
            return new Response(JSON.stringify({ ok: false, error: "post not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const attemptNo = post.attempt_count ?? 0;
          console.log(
            `[social-callback] event=${body.event} post_id=${body.post_id} external_id=${
              (body as any).external_id ?? "-"
            } hmac=ok`,
          );

          if (body.event === "published") {
            if (post.status === "published" && post.external_id === body.external_id) {
              console.log(
                `[social-callback] idempotent-skip post_id=${body.post_id} external_id=${body.external_id} (already published)`,
              );
              await logCallbackAttempt({
                postId: body.post_id,
                attemptNo,
                status: "skipped",
                error: `سبق استلام published لنفس external_id=${body.external_id}`,
                externalId: body.external_id,
                requestPayload: rawParsed,
                hmacValid: true,
                idempotentSkip: true,
              });
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
            await logCallbackAttempt({
              postId: body.post_id,
              attemptNo,
              status: "success",
              externalId: body.external_id,
              requestPayload: rawParsed,
              hmacValid: true,
            });
            return Response.json({ ok: true });
          }

          if (body.event === "failed") {
            await supabaseAdmin
              .from("social_posts")
              .update({ status: "failed", error_message: body.error.slice(0, 1000) })
              .eq("id", body.post_id);
            await logCallbackAttempt({
              postId: body.post_id,
              attemptNo,
              status: "failed",
              error: body.error,
              requestPayload: rawParsed,
              hmacValid: true,
            });
            return Response.json({ ok: true });
          }

          // event === "stats"
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
