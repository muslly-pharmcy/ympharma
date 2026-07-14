// ============================================================
// PermissionService — adapter over legacy user_roles / has_role.
// Do NOT replace existing role gating yet; this is a forward-compatible
// facade so modules can start writing against a stable contract.
// ============================================================
import { ForbiddenError } from "@/core/errors/AppError";
import type { Permission, Role } from "./types";

// Initial mapping: permission -> roles that satisfy it.
// Extend as modules onboard. Keep additive.
const PERMISSION_ROLE_MAP: Record<string, Role[]> = {
  "admin.read": ["owner", "admin"],
  "admin.write": ["owner", "admin"],
  "org.manage": ["owner", "admin"],
  "org.members.read": ["owner", "admin", "manager"],
  "org.members.write": ["owner", "admin"],
};

export interface PermissionCheckContext {
  orgId?: string | null;
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
    _ctx: PermissionCheckContext = {},
  ): Promise<boolean> {
    const roles = PERMISSION_ROLE_MAP[permission];
    if (!roles || roles.length === 0) return false;
    for (const r of roles) {
      if (await this.hasRole(userId, r)) return true;
    }
    return false;
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
        `requires permission=${permission}`,
      );
    }
  },
};
