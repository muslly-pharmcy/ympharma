// Daily cron endpoint: generates posts via DeepSeek, inserts them, then
// forwards each one to the n8n webhook. Protected by INTERNAL_CRON_SECRET
// (Bearer header) — `/api/public/*` bypasses platform auth.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function verifyBearer(request: Request): Response | null {
  const expected = process.env.INTERNAL_CRON_SECRET;
  if (!expected) {
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_CRON_SECRET not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const Route = createFileRoute("/api/public/hooks/run-social-posts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyBearer(request);
        if (unauth) return unauth;

        try {
          const { generateDailyDrafts } = await import("@/lib/social-content.server");
          const { publishPostById } = await import("@/lib/social-publisher.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const drafts = await generateDailyDrafts();
          if (drafts.length === 0) {
            return Response.json({ ok: true, generated: 0, published: 0, failed: 0 });
          }

          const { data: inserted, error } = await supabaseAdmin
            .from("social_posts")
            .insert(drafts)
            .select("id");
          if (error) throw new Error(error.message);

          let published = 0;
          let failed = 0;
          for (const row of inserted ?? []) {
            const r = await publishPostById(row.id);
            if (r.ok) published += 1;
            else failed += 1;
          }

          return Response.json({
            ok: true,
            generated: drafts.length,
            published,
            failed,
          });
        } catch (e) {
          console.error("[cron run-social-posts]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
