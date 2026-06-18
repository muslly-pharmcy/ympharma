import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ADMIN_RECIPIENTS = ["alimohmed.321@gmail.com"];
const COOLDOWN_MIN = 60;
const STATUS_URL = "https://muslly.com/status";

async function assertOwner(ctx: any) {
  const { data } = await ctx.supabase.from("user_roles").select("role")
    .eq("user_id", ctx.userId).in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/** Send a registered template to one or more admins; logs result per recipient. */
export const sendAdminEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    templateName: z.enum(["incident-alert", "error-alert", "test-email"]),
    templateData: z.record(z.string(), z.any()).default({}),
    recipients: z.array(z.string().email()).optional(),
    cooldownKey: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context);

    // Cooldown
    if (data.cooldownKey) {
      const { data: dedupe } = await context.supabase
        .from("alert_dedupe").select("last_sent_at").eq("alert_key", `email:${data.cooldownKey}`).maybeSingle();
      if (dedupe) {
        const ageMin = (Date.now() - new Date(dedupe.last_sent_at).getTime()) / 60000;
        if (ageMin < COOLDOWN_MIN) return { sent: false, reason: "cooldown", minutesRemaining: Math.ceil(COOLDOWN_MIN - ageMin), results: [] };
      }
    }

    const recipients = data.recipients?.length ? data.recipients : ADMIN_RECIPIENTS;
    const origin = process.env.SUPABASE_URL?.includes("supabase") ? "https://muslly.com" : "https://muslly.com";
    const authHeader = `Bearer ${(context as any).claims?.token ?? ""}`;

    // We need a Supabase JWT to call /lovable/email/transactional/send. The
    // auth middleware does not expose the raw token — mint a service-role-signed
    // call by hitting the route with the user's session token via the original request.
    // Simpler: use service role to enqueue directly into pgmq via the send route's logic.
    // We replicate the minimal enqueue path: render + enqueue to transactional_emails.
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const entry = TEMPLATES[data.templateName];
    if (!entry) return { sent: false, reason: "template_not_found", results: [] };

    const React = await import("react");
    const { render } = await import("@react-email/components");

    const tplData = { statusUrl: STATUS_URL, ...data.templateData };
    const html = await render(React.createElement(entry.component, tplData));
    const subject = typeof entry.subject === "function" ? entry.subject(tplData) : entry.subject;

    const results: Array<{ to: string; status: "accepted" | "rejected"; reason?: string }> = [];
    for (const to of recipients) {
      // Check suppression
      const { data: sup } = await admin.from("suppressed_emails").select("email").eq("email", to.toLowerCase()).maybeSingle();
      if (sup) {
        await admin.from("email_send_log").insert({
          template_name: data.templateName, recipient_email: to, status: "suppressed", error_message: "Recipient suppressed",
        });
        results.push({ to, status: "rejected", reason: "suppressed" });
        continue;
      }

      const messageId = `${data.templateName}-${crypto.randomUUID()}`;
      const payload = {
        message_id: messageId,
        to,
        from: `ympharma <no-reply@muslly.com>`,
        sender_domain: "notify.muslly.com",
        subject,
        html,
        purpose: "transactional",
        label: data.templateName,
        idempotency_key: messageId,
        queued_at: new Date().toISOString(),
      };

      const { error: enqErr } = await admin.rpc("enqueue_email", { queue_name: "transactional_emails", payload });
      if (enqErr) {
        await admin.from("email_send_log").insert({
          message_id: messageId, template_name: data.templateName, recipient_email: to,
          status: "failed", error_message: enqErr.message,
        });
        results.push({ to, status: "rejected", reason: enqErr.message });
        continue;
      }
      await admin.from("email_send_log").insert({
        message_id: messageId, template_name: data.templateName, recipient_email: to, status: "pending",
      });
      results.push({ to, status: "accepted" });
    }

    if (data.cooldownKey && results.some(r => r.status === "accepted")) {
      await admin.from("alert_dedupe").upsert({
        alert_key: `email:${data.cooldownKey}`, last_sent_at: new Date().toISOString(), count: 1,
      }, { onConflict: "alert_key" });
    }

    return { sent: results.some(r => r.status === "accepted"), results };
  });

/** List the most recent 50 emails (deduplicated by message_id). */
export const listEmailLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context);
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from("email_send_log")
      .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const dedup: typeof data = [];
    for (const row of data ?? []) {
      const key = row.message_id ?? `${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(row);
      if (dedup.length >= 50) break;
    }
    return { logs: dedup };
  });
