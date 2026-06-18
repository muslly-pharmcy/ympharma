import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles").select("role").eq("user_id", ctx.userId)
    .in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getRetentionConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("retention_config").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const ConfigSchema = z.object({
  error_logs_days: z.number().int().min(1).max(3650),
  error_logs_archive_days: z.number().int().min(1).max(3650),
  incidents_days: z.number().int().min(1).max(3650),
  incidents_archive_days: z.number().int().min(1).max(3650),
  uptime_checks_days: z.number().int().min(1).max(3650),
  archive_enabled: z.boolean(),
  email_alerts_enabled: z.boolean(),
  email_recipients: z.array(z.string().email()).max(20),
  email_cooldown_minutes: z.number().int().min(1).max(1440),
});

export const updateRetentionConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConfigSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("retention_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runRetentionNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("run_retention_policy");
    if (error) throw new Error(error.message);
    return data;
  });

/** Simulate a WhatsApp inbound "تأمين" message by posting to our own webhook
 *  with the admin's phone number as the "from". The webhook will respond with
 *  a real WhatsApp message to that phone containing the insurance form link. */
export const testWhatsappInsuranceBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      phone: z.string().min(6).max(20),
      text: z.string().min(1).max(200).default("تأمين"),
      baseUrl: z.string().url().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const digits = data.phone.replace(/\D+/g, "");
    const to = digits.startsWith("0") ? "967" + digits.slice(1)
      : digits.startsWith("967") ? digits
      : digits.length === 9 ? "967" + digits : digits;

    const payload = {
      entry: [{
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "test" },
            messages: [{
              from: to,
              id: `wamid.test_${Date.now()}`,
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: "text",
              text: { body: data.text },
            }],
          },
          field: "messages",
        }],
      }],
    };
    const base = data.baseUrl ?? "https://muslly.com";
    const res = await fetch(`${base}/api/public/whatsapp-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, sentTo: to, response: body.slice(0, 400) };
  });
