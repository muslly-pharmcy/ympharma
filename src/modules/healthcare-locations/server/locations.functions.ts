import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLocationSchema, type CreateLocationInput } from "../domain/schemas";

export const createHealthcareLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateLocationInput) => createLocationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hc_create_location", { _payload: data as never });
    if (error) throw new Error(error.message);
    return { location_id: id as string };
  });

export const listHealthcareLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organization_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("hc_locations").select("*").eq("organization_id", data.organization_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
