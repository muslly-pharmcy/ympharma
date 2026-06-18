import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

// Webhook endpoint for external uptime monitors (UptimeRobot/BetterStack/etc).
// Opens an incident when the site goes down and closes it when it recovers.
// Caller must POST JSON: { event: "down" | "up", summary?, severity? }
// and include header  x-uptime-signature: <hex hmac-sha256 of raw body>
// using shared secret UPTIME_WEBHOOK_SECRET.

export const Route = createFileRoute("/api/public/uptime-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.UPTIME_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 503 });
        }
        const signature = request.headers.get("x-uptime-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { event?: string; summary?: string; severity?: string } = {};
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        if (payload.event === "down") {
          const severity = ["minor", "major", "critical"].includes(payload.severity ?? "")
            ? payload.severity!
            : "major";
          // open a new incident only if none currently open
          const { data: open } = await admin
            .from("uptime_incidents")
            .select("id")
            .is("ended_at", null)
            .limit(1)
            .maybeSingle();
          if (!open) {
            await admin.from("uptime_incidents").insert({
              severity,
              summary: payload.summary?.slice(0, 500) ?? "تعذّر الوصول إلى الموقع",
            });
          }
        } else if (payload.event === "up") {
          await admin
            .from("uptime_incidents")
            .update({ ended_at: new Date().toISOString() })
            .is("ended_at", null);
        } else {
          return new Response("Unknown event", { status: 400 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
