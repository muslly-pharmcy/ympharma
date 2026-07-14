import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FeatureFlagService } from "@/platform/feature-flags";

const ORG = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // no dashes after normalization
const USER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("FeatureFlagService (staticProvider)", () => {
  const backup = { ...process.env };
  beforeEach(() => {
    process.env.FEATURE_FLAGS = JSON.stringify({ "new-cart": true, beta: false });
    process.env[`FEATURE_FLAGS_ORG_${ORG}`] = JSON.stringify({ beta: true });
    process.env[`FEATURE_FLAGS_USER_${USER}`] = JSON.stringify({ "new-cart": false });
  });
  afterEach(() => {
    process.env = { ...backup };
  });

  it("returns global default", async () => {
    expect(await FeatureFlagService.isEnabled("new-cart")).toBe(true);
    expect(await FeatureFlagService.isEnabled("beta")).toBe(false);
    expect(await FeatureFlagService.isEnabled("missing")).toBe(false);
  });

  it("org override wins over global", async () => {
    expect(await FeatureFlagService.isEnabled("beta", { orgId: ORG })).toBe(true);
  });

  it("user override wins over org and global", async () => {
    expect(
      await FeatureFlagService.isEnabled("new-cart", { orgId: ORG, userId: USER }),
    ).toBe(false);
  });
});
