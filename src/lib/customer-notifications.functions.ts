// Phase 6C Sprint 3 — Customer notification preferences (server functions).
//
// Public token-authenticated opt-out: the trigger creates a preferences row
// for every dispatched recipient with a unique opt_out_token; the customer
// receives a link of the form `${opt_out_base_url}?t=<token>`. No login.
//
// All DB writes go through SECURITY DEFINER RPCs that validate the token
// server-side (length check + lookup), so no broad anon write policy is
// required on the table.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

const tokenSchema = z.object({ token: z.string().min(8).max(128) });

export const getCustomerNotificationStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: res, error } = await sb.rpc(
      "customer_notification_get_status" as never,
      { _token: data.token } as never,
    );
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      reason?: string;
      phone_suffix?: string;
      whatsapp_enabled?: boolean;
      prescription_notifications_enabled?: boolean;
    };
  });

export const setCustomerNotificationOptOut = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenSchema.extend({ optOut: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: res, error } = await sb.rpc(
      "customer_notification_set_optout" as never,
      { _token: data.token, _opt_out: data.optOut } as never,
    );
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      reason?: string;
      phone_suffix?: string;
      opted_out?: boolean;
    };
  });
