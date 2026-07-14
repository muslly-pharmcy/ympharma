// ============================================================
// PermissionService — org-scoped permission checks backed by
// public.has_org_permission RPC. Legacy hasRole retained for
// admin/owner platform-level checks (public.user_roles).
// ============================================================
import { ForbiddenError } from "@/core/errors/AppError";
import type { Permission, Role } from "./types";

export interface PermissionCheckContext {
  orgId?: string | null;
  branchId?: string | null;
}

export const PermissionService = {
  async hasRole(userId: string, role: Role): Promise<boolean> {
    const { hasLegacyRole } = await import(
      "./adapters/legacyRolesAdapter.server"
    );
    return hasLegacyRole(userId, role);
  },

  async check(
    userId: string,
    permission: Permission,
    ctx: PermissionCheckContext = {},
  ): Promise<boolean> {
    if (!ctx.orgId) return false;
    const { hasOrgPermission } = await import(
      "./adapters/orgPermissionAdapter.server"
    );
    return hasOrgPermission(userId, ctx.orgId, permission, ctx.branchId ?? undefined);
  },

  async requireRole(userId: string, role: Role): Promise<void> {
    if (!(await this.hasRole(userId, role))) {
      throw new ForbiddenError("Insufficient role", `requires role=${role}`);
    }
  },

  async require(
    userId: string,
    permission: Permission,
    ctx: PermissionCheckContext = {},
  ): Promise<void> {
    if (!(await this.check(userId, permission, ctx))) {
      throw new ForbiddenError(
        "Insufficient permission",
        `requires permission=${permission}${ctx.orgId ? ` in org=${ctx.orgId}` : ""}`,
      );
    }
  },
};
