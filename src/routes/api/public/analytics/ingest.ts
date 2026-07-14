import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z.object({
  name: z.string().min(1).max(64),
  ts: z.number().int().nonnegative(),
  sid: z.string().min(1).max(128),
  path: z.string().max(512).optional().default("/"),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(50) });

export const Route = createFileRoute("/api/public/analytics/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          if (raw.length > 20_000) return new Response("Payload too large", { status: 413 });
          const parsed = bodySchema.safeParse(JSON.parse(raw));
          if (!parsed.success) return new Response("Bad request", { status: 400 });
          // Anonymous, no PII stored. For now: server-side count log only.
          console.log("[visitor-analytics]", parsed.data.events.length, "events");
          return new Response(null, { status: 204 });
        } catch {
          return new Response("Bad request", { status: 400 });
        }
      },
    },
  },
});
