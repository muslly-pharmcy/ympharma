// Public contact-form intake. Validates with Zod, writes to contact_messages.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  checkCooldown,
  extractIp,
  hashIp,
  readTextWithLimit,
} from "@/lib/public-endpoint-guard.server";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(1000),
});

// Max ~4 KB is far above the 1000-char message limit.
const MAX_BODY_BYTES = 4 * 1024;
// 5 submissions / 10 minutes per IP.
const COOLDOWN_LIMIT = 5;
const COOLDOWN_WINDOW_MS = 10 * 60 * 1000;

export const Route = createFileRoute("/api/public/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = extractIp(request);
        const ipHash = await hashIp(ip);

        const cooldown = checkCooldown(ipHash, COOLDOWN_LIMIT, COOLDOWN_WINDOW_MS);
        if (!cooldown.allowed) {
          return Response.json(
            { error: "rate_limited" },
            {
              status: 429,
              headers: { "Retry-After": String(cooldown.retryAfter) },
            },
          );
        }

        const read = await readTextWithLimit(request, MAX_BODY_BYTES);
        if (read.oversize) {
          return Response.json({ error: "payload_too_large" }, { status: 413 });
        }

        let body: unknown;
        try {
          body = JSON.parse(read.text);
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = contactSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "validation", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const user_agent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
          const { error } = await supabaseAdmin
            .from("contact_messages")
            .insert({ ...parsed.data, ip_hash: ipHash, user_agent } as never);
          if (error) {
            console.error("[contact] insert failed", error.message);
            return Response.json({ error: "storage_failed" }, { status: 500 });
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[contact] handler error", e);
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
