import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/ai/content-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronAuth(request);
        if (denied) {
          console.warn("[content-tick] unauthorized cron attempt", {
            ip: request.headers.get("x-forwarded-for") ?? "unknown",
            ua: request.headers.get("user-agent") ?? "unknown",
          });
          return denied;
        }
        try {
          const { generateDailyMedicalPost } = await import(
            "@/ai/content/medical-content-engine.server"
          );
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const post = await generateDailyMedicalPost();
          const today = new Date().toISOString().slice(0, 10);
          const slug = `${post.slug}-${today}`.slice(0, 100);

          const { data, error } = await supabaseAdmin
            .from("medical_posts")
            .insert({
              title: post.title,
              slug,
              category: post.category,
              content: post.content,
              summary: post.summary,
              language: post.language,
              tags: post.tags as never,
              ai_generated: true,
              approved: false,
              publish_date: today,
            } as never)
            .select("id, slug")
            .maybeSingle();

          if (error) throw error;
          return Response.json({ ok: true, post: data });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[content-tick] failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
