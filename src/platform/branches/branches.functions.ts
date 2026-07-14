// Phoenix Phase 3 — Branch server functions (org-scoped).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Branch, BranchAssignment } from "./types";

async function assertPerm(
  supabase: any,
  userId: string,
  orgId: string,
  permission: string,
  branchId?: string,
) {
  const { data, error } = await supabase.rpc("has_org_permission" as never, {
    _user_id: userId,
    _org_id: orgId,
    _permission: permission,
    _branch_id: branchId ?? null,
  } as never);
  if (error) throw error;
  if (!data) throw new Error(`Forbidden: missing permission ${permission}`);
}

export const listBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Branch[]> => {
    const { supabase, userId } = context;
    await assertPerm(supabase, userId, data.organizationId, "branches.read");
    const { data: rows, error } = await supabase
      .from("branches")
      .select("*")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (rows ?? []) as Branch[];
  });

export const createBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(200),
        code: z.string().min(1).max(50).optional(),
        type: z.string().max(50).optional(),
        address: z.string().max(500).optional(),
        phone: z.string().max(50).optional(),
        location: z.record(z.string(), z.any()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Branch> => {
    const { supabase, userId } = context;
    await assertPerm(supabase, userId, data.organizationId, "branches.manage");
    const { data: row, error } = await supabase
      .from("branches")
      .insert({
        organization_id: data.organizationId,
        name: data.name,
        code: data.code ?? null,
        type: (data.type ?? null) as never,
        address: data.address ?? null,
        phone: data.phone ?? null,
        location: (data.location ?? {}) as never,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return row as Branch;
  });

export const updateBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        id: z.string().uuid(),
        patch: z.record(z.string(), z.any()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Branch> => {
    const { supabase, userId } = context;
    await assertPerm(supabase, userId, data.organizationId, "branches.manage", data.id);
    const { data: row, error } = await supabase
      .from("branches")
      .update(data.patch as never)
      .eq("id", data.id)
      .eq("organization_id", data.organizationId)
      .select("*")
      .single();
    if (error) throw error;
    return row as Branch;
  });

export const assignUserToBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        branchId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.string().min(1).max(50).default("staff"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<BranchAssignment> => {
    const { supabase, userId } = context;
    await assertPerm(
      supabase,
      userId,
      data.organizationId,
      "branches.manage",
      data.branchId,
    );
    const { data: row, error } = await supabase
      .from("branch_user_assignments")
      .insert({
        branch_id: data.branchId,
        user_id: data.userId,
        role: data.role as never,
        assigned_by: userId,
        status: "active",
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return row as BranchAssignment;
  });

export const removeBranchAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        branchId: z.string().uuid(),
        userId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await assertPerm(
      supabase,
      userId,
      data.organizationId,
      "branches.manage",
      data.branchId,
    );
    const { error } = await supabase
      .from("branch_user_assignments")
      .delete()
      .eq("branch_id", data.branchId)
      .eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });
