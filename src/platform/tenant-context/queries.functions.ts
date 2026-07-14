import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Organization,
  OrganizationRole,
  OrganizationType,
  OrganizationWithRole,
  OrgMetadata,
  OrgMetadataValue,
} from "./types";

const MetadataSchema: z.ZodType<OrgMetadata> = z.lazy(() =>
  z.record(
    z.string(),
    z.lazy(() =>
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.any()),
        z.record(z.string(), z.any()),
      ]),
    ) as z.ZodType<OrgMetadataValue>,
  ),
);

const OrgTypeSchema = z.enum([
  "PHARMACY",
  "CLINIC",
  "LAB",
  "INSURANCE",
  "SUPPLIER",
  "CORPORATE",
]);
const RoleSchema = z.enum([
  "owner",
  "admin",
  "manager",
  "employee",
  "pharmacist",
  "doctor",
  "supplier_user",
  "insurance_user",
  "customer",
]);

export const listMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrganizationWithRole[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("organization_members")
      .select(
        "role, status, organization:organizations(id,name,type,status,metadata,created_at,updated_at)",
      )
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw error;
    return (data ?? [])
      .filter((r: any) => r.organization)
      .map((r: any) => ({ ...(r.organization as Organization), role: r.role as OrganizationRole }));
  });

export const getOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Organization | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("organizations")
      .select("id,name,type,status,metadata,created_at,updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return (row as Organization | null) ?? null;
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1).max(200),
        type: OrgTypeSchema,
        metadata: MetadataSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Organization> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("organizations")
      .insert({
        name: data.name,
        type: data.type as OrganizationType,
        metadata: data.metadata ?? {},
        created_by: userId,
      })
      .select("id,name,type,status,metadata,created_at,updated_at")
      .single();
    if (error) throw error;
    return row as Organization;
  });

export const switchOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Organization> => {
    const { supabase, userId } = context;
    // Validate membership via RLS-scoped read
    const { data: membership, error: mErr } = await supabase
      .from("organization_members")
      .select("role,status")
      .eq("organization_id", data.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (mErr) throw mErr;
    if (!membership) throw new Error("Not a member of this organization");

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id,name,type,status,metadata,created_at,updated_at")
      .eq("id", data.id)
      .single();
    if (error) throw error;

    // Best-effort audit log via service role (trigger-driven events cover create/member changes)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("log_org_event", {
        _org: data.id,
        _actor: userId,
        _type: "org.switched",
        _payload: { role: (membership as any).role },
      });
    } catch {
      // non-fatal
    }

    return org as Organization;
  });

export const addMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        userId: z.string().uuid(),
        role: RoleSchema.default("employee"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("organization_members").insert({
      organization_id: data.organizationId,
      user_id: data.userId,
      role: data.role,
      status: "active",
    });
    if (error) throw error;
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        userId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

// ---- Phoenix Phase 3 ---------------------------------------

export const listMyOrgPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ organizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<string[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc(
      "list_my_org_permissions" as never,
      { _org_id: data.organizationId } as never,
    );
    if (error) throw error;
    return ((rows as Array<{ permission_key: string }> | null) ?? []).map(
      (r) => r.permission_key,
    );
  });

export const assertOrgAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ organizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Forbidden: not a member of this organization");
    return { ok: true };
  });
