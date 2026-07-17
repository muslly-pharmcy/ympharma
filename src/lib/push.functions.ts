import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SubscribeInput = z.object({
  visitorToken: z.string().min(8).nullable(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userAgent: z.string().max(500).optional(),
});

export const subscribePush = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubscribeInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          visitor_token: data.visitorToken,
          endpoint: data.subscription.endpoint,
          p256dh: data.subscription.keys.p256dh,
          auth: data.subscription.keys.auth,
          user_agent: data.userAgent || null,
          active: true,
        } as never,
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UnsubInput = z.object({ endpoint: z.string().url() });

export const unsubscribePush = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UnsubInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });
