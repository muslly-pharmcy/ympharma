import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  deliveryId: z.string().uuid(),
  event: z.enum(["opened", "clicked"]),
});

export const Route = createFileRoute("/api/public/engagement/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json();
          const { deliveryId, event } = Body.parse(raw);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const field = event === "opened" ? "opened_at" : "clicked_at";
          await supabaseAdmin
            .from("campaign_deliveries")
            .update({ [field]: new Date().toISOString() } as never)
            .eq("id", deliveryId)
            .is(field, null);
          return Response.json({ ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
