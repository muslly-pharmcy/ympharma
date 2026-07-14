export interface FeatureFlagContext {
  orgId?: string | null;
  userId?: string | null;
}

export interface FeatureFlagProvider {
  isEnabled(flag: string, ctx: FeatureFlagContext): Promise<boolean>;
  /** optional bulk read for UI hydration */
  all?(ctx: FeatureFlagContext): Promise<Record<string, boolean>>;
}
