// Multi-branch CRUD + branch-scoped inventory list.
// Staff-only; uses requireSupabaseAuth.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertOwnerOrAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!data) throw new Error("صلاحيات المالك/المدير مطلوبة");
}

export const listBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ includeInactive: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("branches")
      .select("id,code,name,type,address,phone,manager_user_id,is_active,metadata,created_at")
      .order("type", { ascending: true })
      .order("code", { ascending: true });
    if (!data.includeInactive) q = q.eq("is_active", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string; code: string; name: string; type: string;
      address: string | null; phone: string | null;
      manager_user_id: string | null; is_active: boolean;
      metadata: Record<string, unknown>; created_at: string;
    }>;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  type: z.enum(["WAREHOUSE", "BRANCH", "OFFICE"]),
  address: z.string().trim().max(400).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  manager_user_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const upsertBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwnerOrAdmin(context.supabase, context.userId);
    const payload: Record<string, unknown> = {
      code: data.code, name: data.name, type: data.type,
      address: data.address ?? null, phone: data.phone ?? null,
      manager_user_id: data.manager_user_id ?? null,
    };
    if (data.is_active !== undefined) payload.is_active = data.is_active;

    if (data.id) {
      const { error } = await context.supabase.from("branches").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("branches").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (ins as { id: string }).id };
  });

export const listBranchInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      branch_id: z.string().uuid(),
      search: z.string().trim().max(120).optional(),
      onlyLow: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("branch_inventory")
      .select("id,product_id,qty,reserved_qty,reorder_point,updated_at,products!inner(name,brand,price,legacy_id)")
      .eq("branch_id", data.branch_id)
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.search) q = q.ilike("products.name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let out = (rows ?? []) as any[];
    if (data.onlyLow) out = out.filter((r) => r.qty - r.reserved_qty <= (r.reorder_point ?? 0));
    return out;
  });

export const listMyBranchAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("branch_user_assignments")
      .select("branch_id,role,branches!inner(code,name,type)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });
