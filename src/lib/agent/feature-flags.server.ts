// Feature flags backed by public.app_settings (admin-tunable, no redeploy).
// Server-only. Cached in-process for 30s to avoid hammering the DB.

const CACHE = new Map<string, { value: boolean; expires: number }>();
const TTL_MS = 30_000;

export async function isFlagEnabled(key: string, defaultValue = false): Promise<boolean> {
  const cached = CACHE.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    const raw = data?.value;
    const value = raw === true || raw === "true" || raw === 1;
    CACHE.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch {
    return defaultValue;
  }
}
