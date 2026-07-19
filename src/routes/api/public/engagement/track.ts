import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { readTextWithLimit } from "@/lib/public-endpoint-guard.server";

const Body = z.object({
  deliveryId: z.string().uuid(),
  event: z.enum(["opened", "clicked"]),
});

const MAX_BYTES = 2_048; // 2 KB — payload is a tiny JSON object

export const Route = createFileRoute("/api/public/engagement/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const read = await readTextWithLimit(request, MAX_BYTES);
          if (read.oversize) {
            return new Response("Payload too large", { status: 413 });
          }
          const parsed = Body.safeParse(JSON.parse(read.text));
          if (!parsed.success) {
            return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
          }
          const { deliveryId, event } = parsed.data;
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
