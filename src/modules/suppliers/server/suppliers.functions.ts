import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createSupplierSchema, linkSupplierProductSchema,
  type CreateSupplierInput, type LinkSupplierProductInput,
} from "../domain/schemas";

export const createSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateSupplierInput) => createSupplierSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sup_suppliers")
      .insert({ ...data, created_by: context.userId })
      .select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organization_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sup_suppliers").select("*")
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const linkSupplierProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: LinkSupplierProductInput) => linkSupplierProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sup_supplier_products").insert(data).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });
