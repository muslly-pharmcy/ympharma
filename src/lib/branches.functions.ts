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
    return (rows ?? []) as any[];
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
    const payload: any = {
      code: data.code, name: data.name, type: data.type,
      address: data.address ?? null, phone: data.phone ?? null,
      manager_user_id: data.manager_user_id ?? null,
    };
    if (data.is_active !== undefined) payload.is_active = data.is_active;

    if (data.id) {
      const { error } = await (context.supabase.from("branches") as any).update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await (context.supabase.from("branches") as any)
      .insert(payload).select("id").single();
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
    const limit = data.limit ?? 50;
    const offset = (data as any).offset ?? 0;
    let q = context.supabase
      .from("branch_inventory")
      .select(
        "id,product_id,qty,reserved_qty,reorder_point,updated_at,products!inner(name,brand,price,legacy_id)",
        { count: "exact" },
      )
      .eq("branch_id", data.branch_id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (data.search) q = q.ilike("products.name", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    let out = (rows ?? []) as any[];
    if (data.onlyLow) out = out.filter((r) => r.qty - r.reserved_qty <= (r.reorder_point ?? 0));
    return { rows: out, count: count ?? 0, limit, offset };
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

export const toggleBranchActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnerOrAdmin(context.supabase, context.userId);
    const { error } = await (context.supabase.from("branches") as any)
      .update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBranchAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ branch_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("branch_user_assignments")
      .select("id,user_id,role,created_at")
      .eq("branch_id", data.branch_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];
    // hydrate emails via auth admin (best-effort)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const out = await Promise.all((rows as any[]).map(async (r) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        return { ...r, email: u?.user?.email ?? null };
      }));
      return out;
    } catch {
      return rows as any[];
    }
  });

export const assignUserToBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      branch_id: z.string().uuid(),
      email: z.string().trim().email().max(255),
      role: z.enum(["manager","staff","viewer"]).default("staff"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnerOrAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // resolve email → user id via admin API (lists 1 page; OK for ops scale)
    const { data: usersPage, error: listErr } = await supabaseAdmin.auth.admin
      .listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(listErr.message);
    const u = usersPage.users.find((x) => x.email?.toLowerCase() === data.email.toLowerCase());
    if (!u) throw new Error("لم يُعثر على مستخدم بهذا البريد");
    const { error } = await (context.supabase.from("branch_user_assignments") as any)
      .upsert({ branch_id: data.branch_id, user_id: u.id, role: data.role },
              { onConflict: "user_id,branch_id" });
    if (error) throw new Error(error.message);
    return { ok: true, user_id: u.id };
  });

export const unassignUserFromBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnerOrAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("branch_user_assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Phase 4B: Branch Reorder Suggestions (recommendation only) ────────
// Pure read. Does NOT create transfers or mutate inventory.
export const branchReorderSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      branch_id: z.string().uuid(),
      lookback_days: z.number().int().min(1).max(365).optional(),
      coverage_days: z.number().int().min(1).max(180).optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "branch_reorder_suggestions" as never,
      {
        _branch_id: data.branch_id,
        _lookback_days: data.lookback_days ?? 30,
        _coverage_days: data.coverage_days ?? 14,
        _limit: data.limit ?? 100,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as any[] };
  });
