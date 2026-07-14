import { staticProvider } from "./providers/staticProvider";
import type { FeatureFlagContext, FeatureFlagProvider } from "./types";

let provider: FeatureFlagProvider = staticProvider;

export const FeatureFlagService = {
  setProvider(p: FeatureFlagProvider): void {
    provider = p;
  },
  async isEnabled(flag: string, ctx: FeatureFlagContext = {}): Promise<boolean> {
    return provider.isEnabled(flag, ctx);
  },
  async all(ctx: FeatureFlagContext = {}): Promise<Record<string, boolean>> {
    return provider.all ? provider.all(ctx) : {};
  },
};
