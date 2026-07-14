// ============================================================
// orgPermissionAdapter — wraps public.has_org_permission RPC.
// ============================================================
export async function hasOrgPermission(
  userId: string,
  orgId: string,
  permission: string,
  branchId?: string,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_org_permission" as never, {
    _user_id: userId,
    _org_id: orgId,
    _permission: permission,
    _branch_id: branchId ?? null,
  } as never);
  if (error) return false;
  return Boolean(data);
}
