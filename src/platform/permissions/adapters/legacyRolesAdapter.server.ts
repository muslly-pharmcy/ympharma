// ============================================================
// legacyRolesAdapter — bridges the new PermissionService to the
// existing public.user_roles table via the has_role RPC.
// ============================================================
export async function hasLegacyRole(
  userId: string,
  role: string,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: role as never,
  });
  if (error) return false;
  return Boolean(data);
}
