// Cron-driven monitor: alerts when inbound WhatsApp messages were received
// but the parent conversation's `last_message`/`last_message_at` was not
// updated by the webhook — a sign the persistence path failed mid-request.
//
// Detection: scan inbound `whatsapp_messages` rows from the last
// `STALE_WINDOW_MIN` minutes; for each, if the parent conversation either has
// NULL `last_message` or its `last_message_at` is OLDER than the message's
// `created_at` (minus a 30s grace), surface a staff_alert. Deduped via
// `alert_dedupe` with key `wa_stale:{conversation_id}` and a 1-hour cooldown
// so a single failure does not spam the team.
//
// Pull on pg_cron every 5 min:
//   SELECT net.http_post(
//     'https://project--<id>.lovable.app/api/public/hooks/wa-stale-conversations',
//     headers => jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
//   );

import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

const STALE_WINDOW_MIN = Number(process.env.WA_STALE_WINDOW_MIN ?? 30);
const GRACE_SECONDS = 30;
const DEDUPE_COOLDOWN_MIN = 60;
const MAX_BATCH = 50;

export const Route = createFileRoute("/api/public/hooks/wa-stale-conversations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const windowStart = new Date(Date.now() - STALE_WINDOW_MIN * 60_000).toISOString();

        // Get recent inbound messages
        const { data: msgs, error: msgErr } = await supabaseAdmin
          .from("whatsapp_messages")
          .select("id, conversation_id, content, created_at")
          .eq("direction", "inbound")
          .gte("created_at", windowStart)
          .order("created_at", { ascending: false })
          .limit(MAX_BATCH);

        if (msgErr) return Response.json({ ok: false, error: msgErr.message }, { status: 500 });
        if (!msgs || msgs.length === 0) return Response.json({ ok: true, scanned: 0, stale: 0 });

        // Keep only the newest message per conversation
        const newestByConvo = new Map<string, { id: string; content: string | null; created_at: string }>();
        for (const m of msgs as Array<{ id: string; conversation_id: string; content: string | null; created_at: string }>) {
          if (!newestByConvo.has(m.conversation_id)) {
            newestByConvo.set(m.conversation_id, { id: m.id, content: m.content, created_at: m.created_at });
          }
        }
        const convoIds = Array.from(newestByConvo.keys());

        const { data: convos, error: convoErr } = await supabaseAdmin
          .from("whatsapp_conversations")
          .select("id, phone_number, last_message, last_message_at")
          .in("id", convoIds);

        if (convoErr) return Response.json({ ok: false, error: convoErr.message }, { status: 500 });

        let staleCount = 0, alertedCount = 0;
        const cooldownCutoff = new Date(Date.now() - DEDUPE_COOLDOWN_MIN * 60_000).toISOString();

        for (const c of (convos ?? []) as Array<{ id: string; phone_number: string; last_message: string | null; last_message_at: string }>) {
          const newest = newestByConvo.get(c.id);
          if (!newest) continue;

          const messageTime = new Date(newest.created_at).getTime();
          const convoTime = new Date(c.last_message_at).getTime();
          const isStale = !c.last_message || convoTime < messageTime - GRACE_SECONDS * 1000;
          if (!isStale) continue;

          staleCount++;

          // Dedupe check
          const alertKey = `wa_stale:${c.id}`;
          const { data: dedupe } = await supabaseAdmin
            .from("alert_dedupe")
            .select("alert_key, last_sent_at, count")
            .eq("alert_key", alertKey)
            .maybeSingle();

          if (dedupe && dedupe.last_sent_at > cooldownCutoff) {
            // Within cooldown — bump counter only
            await supabaseAdmin
              .from("alert_dedupe")
              .update({ count: (dedupe.count ?? 1) + 1 } as never)
              .eq("alert_key", alertKey);
            continue;
          }

          const { error: alertErr } = await supabaseAdmin.from("staff_alerts").insert({
            kind: "wa_conversation_stale",
            severity: "warn",
            title: "محادثة واتساب لم يُسجَّل آخر رسالة فيها",
            body: `العميل ${c.phone_number} أرسل رسالة لكن last_message في الجدول قديم أو فارغ — قد يكون webhook فشل.`,
            entity_type: "whatsapp_conversation",
            entity_id: c.id,
            payload: {
              conversation_id: c.id,
              phone_number: c.phone_number,
              latest_message_id: newest.id,
              latest_message_at: newest.created_at,
              latest_message_preview: (newest.content ?? "").slice(0, 160),
              conversation_last_message: c.last_message,
              conversation_last_message_at: c.last_message_at,
            },
            channels: ["dashboard", "whatsapp"],
          } as never);

          if (!alertErr) {
            alertedCount++;
            await supabaseAdmin
              .from("alert_dedupe")
              .upsert({ alert_key: alertKey, last_sent_at: new Date().toISOString(), count: 1 } as never, { onConflict: "alert_key" });
          }
        }

        return Response.json({
          ok: true,
          scanned: msgs.length,
          conversations_checked: convoIds.length,
          stale: staleCount,
          alerted: alertedCount,
          window_minutes: STALE_WINDOW_MIN,
        });
      },
    },
  },
});
