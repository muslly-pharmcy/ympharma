import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

import { PermissionService } from "@/platform/permissions/PermissionService";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const USER = "11111111-1111-1111-1111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("PermissionService.check (org-scoped)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when no orgId is provided", async () => {
    const ok = await PermissionService.check(USER, "inventory.read");
    expect(ok).toBe(false);
    expect((supabaseAdmin.rpc as any)).not.toHaveBeenCalled();
  });

  it("delegates to has_org_permission and returns true when RPC says true", async () => {
    (supabaseAdmin.rpc as any).mockResolvedValueOnce({ data: true, error: null });
    const ok = await PermissionService.check(USER, "inventory.read", { orgId: ORG_A });
    expect(ok).toBe(true);
    expect((supabaseAdmin.rpc as any)).toHaveBeenCalledWith(
      "has_org_permission",
      expect.objectContaining({
        _user_id: USER,
        _org_id: ORG_A,
        _permission: "inventory.read",
        _branch_id: null,
      }),
    );
  });

  it("enforces tenant isolation — user in org A cannot access org B", async () => {
    (supabaseAdmin.rpc as any).mockResolvedValueOnce({ data: false, error: null });
    const ok = await PermissionService.check(USER, "inventory.read", { orgId: ORG_B });
    expect(ok).toBe(false);
  });

  it("passes branchId through for branch scope enforcement", async () => {
    (supabaseAdmin.rpc as any).mockResolvedValueOnce({ data: true, error: null });
    const branchId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    await PermissionService.check(USER, "branches.manage", { orgId: ORG_A, branchId });
    expect((supabaseAdmin.rpc as any)).toHaveBeenCalledWith(
      "has_org_permission",
      expect.objectContaining({ _branch_id: branchId }),
    );
  });

  it("require() throws ForbiddenError when denied", async () => {
    (supabaseAdmin.rpc as any).mockResolvedValueOnce({ data: false, error: null });
    await expect(
      PermissionService.require(USER, "orders.manage", { orgId: ORG_A }),
    ).rejects.toThrow(/permission/);
  });

  it("returns false when RPC errors (fail-closed)", async () => {
    (supabaseAdmin.rpc as any).mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });
    const ok = await PermissionService.check(USER, "inventory.read", { orgId: ORG_A });
    expect(ok).toBe(false);
  });
});
