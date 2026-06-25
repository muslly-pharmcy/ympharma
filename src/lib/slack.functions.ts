// src/lib/slack.functions.ts
// Slack webhook helpers — validates SLACK_WEBHOOK_URL before sending.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SLACK_URL_RE = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/;

export function isValidSlackWebhookUrl(url: string | undefined | null): boolean {
  return !!url && SLACK_URL_RE.test(url);
}

async function assertAdmin(supabase: any, userId: string) {
  const [a, o] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  if (!a.data && !o.data) throw new Error("غير مصرح");
}

export const testSlackWebhook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return { valid: false, reason: "SLACK_WEBHOOK_URL غير مُعرَّف في البيئة." };
    if (!isValidSlackWebhookUrl(url)) {
      return {
        valid: false,
        reason:
          "القيمة الحالية ليست رابط Slack صالحاً. الصيغة المتوقّعة: https://hooks.slack.com/services/T.../B.../...",
      };
    }
    return { valid: true, reason: "الرابط بصيغة صحيحة." };
  });

export const sendSlackMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { message: string }) =>
    z.object({ message: z.string().min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!isValidSlackWebhookUrl(url)) {
      throw new Error("SLACK_WEBHOOK_URL غير مُعرَّف أو غير صالح.");
    }
    const res = await fetch(url!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.message, mrkdwn: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Slack رفض الطلب (HTTP ${res.status}): ${body.slice(0, 200)}`);
    }
    return { success: true };
  });
