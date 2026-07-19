// Public doctor-join intake. Writes structured payload into contact_messages (no schema change).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  checkCooldown,
  extractIp,
  hashIp,
  readTextWithLimit,
} from "@/lib/public-endpoint-guard.server";

const schema = z.object({
  full_name: z.string().trim().min(3).max(120),
  specialty: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  clinic: z.string().trim().min(2).max(160),
  phone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  working_hours: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  request_verification: z.boolean().default(true),
  photo_data_url: z.string().max(2_500_000).optional().or(z.literal("")),
});

// Photo data URL alone can approach 2.5 MB — cap the whole body at ~3 MB.
const MAX_BODY_BYTES = 3 * 1024 * 1024;
// 3 submissions / 15 minutes per IP.
const COOLDOWN_LIMIT = 3;
const COOLDOWN_WINDOW_MS = 15 * 60 * 1000;

export const Route = createFileRoute("/api/public/doctor-join")({
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
        try { body = JSON.parse(read.text); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
        }
        const d = parsed.data;
        // Fold structured payload into `message` — contact_messages has no metadata column.
        const structured = {
          type: "doctor_join",
          full_name: d.full_name,
          specialty: d.specialty,
          city: d.city,
          clinic: d.clinic,
          phone: d.phone,
          working_hours: d.working_hours,
          notes: d.notes || null,
          request_verification: d.request_verification,
          has_photo: !!d.photo_data_url,
          submitted_at: new Date().toISOString(),
        };
        const messageText =
          `[DOCTOR_JOIN] ${d.full_name} — ${d.specialty} — ${d.city}\n` +
          `العيادة: ${d.clinic}\nالهاتف: ${d.phone}\nساعات العمل: ${d.working_hours}\n` +
          (d.notes ? `ملاحظات: ${d.notes}\n` : "") +
          `طلب التحقق: ${d.request_verification ? "نعم" : "لا"}\n` +
          `has_photo: ${!!d.photo_data_url}\n---\n` +
          JSON.stringify(structured);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const user_agent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
          const { error } = await supabaseAdmin.from("contact_messages").insert({
            name: d.full_name,
            email: d.email || "no-email@doctor-join.local",
            message: messageText.slice(0, 1000),
            ip_hash: ipHash,
            user_agent,
          } as never);
          if (error) {
            console.error("[doctor-join] insert failed", error.message);
            return Response.json({ error: "storage_failed" }, { status: 500 });
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[doctor-join] handler error", e);
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
