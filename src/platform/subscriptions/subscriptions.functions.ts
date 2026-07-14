// Phoenix Phase 3 — subscription foundation (no billing).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OrganizationSubscription } from "./types";

export const getOrgSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<OrganizationSubscription | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("organization_subscriptions" as never)
      .select("*")
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (error) throw error;
    return (row as OrganizationSubscription | null) ?? null;
  });

export const isOrgFeatureEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ organizationId: z.string().uuid(), feature: z.string().min(1) })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<boolean> => {
    const { supabase } = context;
    const { data: v, error } = await supabase.rpc("org_feature_enabled" as never, {
      _org_id: data.organizationId,
      _feature: data.feature,
    } as never);
    if (error) throw error;
    return Boolean(v);
  });

export const checkOrgLimit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        limit: z.string().min(1),
        current: z.number().int().nonnegative(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<boolean> => {
    const { supabase } = context;
    const { data: v, error } = await supabase.rpc("org_within_limit" as never, {
      _org_id: data.organizationId,
      _limit: data.limit,
      _current: data.current,
    } as never);
    if (error) throw error;
    return Boolean(v);
  });
