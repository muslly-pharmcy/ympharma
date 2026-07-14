import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createWarehouseSchema, createLocationSchema,
  type CreateWarehouseInput, type CreateLocationInput,
} from "../domain/schemas";

export const createWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateWarehouseInput) => createWarehouseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("wh_warehouses")
      .insert({ ...data, created_by: context.userId })
      .select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organization_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("wh_warehouses").select("*")
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateLocationInput) => createLocationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("wh_locations").insert(data).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });
