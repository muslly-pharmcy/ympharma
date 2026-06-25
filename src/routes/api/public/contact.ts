// Public contact-form intake. Validates with Zod, writes to contact_messages.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(1000),
});

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export const Route = createFileRoute("/api/public/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
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
          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            null;
          const ip_hash = await hashIp(ip);
          const user_agent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
          const { error } = await supabaseAdmin
            .from("contact_messages")
            .insert({ ...parsed.data, ip_hash, user_agent } as never);
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
