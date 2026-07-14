// ============================================================
// staticProvider — default provider driven by env + optional org/user overrides.
// ============================================================
// Global defaults:      FEATURE_FLAGS='{"new-cart":true,"beta-copilot":false}'
// Per-org overrides:    FEATURE_FLAGS_ORG_<ORG_ID>='{"new-cart":false}'
// Per-user overrides:   FEATURE_FLAGS_USER_<USER_ID>='{"beta-copilot":true}'
//
// The env is only read on the server. On the client, isEnabled falls back to
// `false`; the app should call a server fn to hydrate flags.

import type { FeatureFlagContext, FeatureFlagProvider } from "../types";

function safeParse(json: string | undefined): Record<string, boolean> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env?.[name];
}

function loadFlags(ctx: FeatureFlagContext): Record<string, boolean> {
  const base = safeParse(readEnv("FEATURE_FLAGS"));
  const orgOverride = ctx.orgId
    ? safeParse(readEnv(`FEATURE_FLAGS_ORG_${ctx.orgId.replace(/-/g, "")}`))
    : {};
  const userOverride = ctx.userId
    ? safeParse(readEnv(`FEATURE_FLAGS_USER_${ctx.userId.replace(/-/g, "")}`))
    : {};
  // precedence: user > org > global
  return { ...base, ...orgOverride, ...userOverride };
}

export const staticProvider: FeatureFlagProvider = {
  async isEnabled(flag, ctx) {
    return Boolean(loadFlags(ctx)[flag]);
  },
  async all(ctx) {
    return loadFlags(ctx);
  },
};
