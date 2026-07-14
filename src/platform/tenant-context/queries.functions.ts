import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Organization,
  OrganizationRole,
  OrganizationType,
  OrganizationWithRole,
} from "./types";

const OrgTypeSchema = z.enum([
  "PHARMACY",
  "CLINIC",
  "LAB",
  "INSURANCE",
  "SUPPLIER",
  "CORPORATE",
]);
const RoleSchema = z.enum(["owner", "admin", "member"]);

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
        metadata: z.record(z.string(), z.unknown()).optional(),
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
        role: RoleSchema.default("member"),
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
