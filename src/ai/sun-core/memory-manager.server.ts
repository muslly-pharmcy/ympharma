// ☀️ Neural Memory Manager — server-only.
// Persists cumulative learning into public.sun_memory (weighted key/value).

export type SunMemoryScope =
  | "customer"
  | "product"
  | "market"
  | "agent"
  | "system";

export interface RememberInput {
  scope: SunMemoryScope;
  subjectId: string;
  key: string;
  value: Record<string, unknown>;
  weightDelta?: number;
}

export interface MemoryRow {
  key: string;
  value: Record<string, unknown>;
  weight: number;
  last_seen_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function remember(admin: any, input: RememberInput): Promise<void> {
  const delta = input.weightDelta ?? 1.0;
  const { data: existing } = await admin
    .from("sun_memory")
    .select("id, weight")
    .eq("scope", input.scope)
    .eq("subject_id", input.subjectId)
    .eq("key", input.key)
    .maybeSingle();

  if (existing) {
    await admin
      .from("sun_memory")
      .update({
        value: input.value,
        weight: Number(existing.weight) + delta,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await admin.from("sun_memory").insert({
      scope: input.scope,
      subject_id: input.subjectId,
      key: input.key,
      value: input.value,
      weight: delta,
    });
  }
}

export async function recall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  scope: SunMemoryScope,
  subjectId: string,
): Promise<MemoryRow[]> {
  const { data } = await admin
    .from("sun_memory")
    .select("key, value, weight, last_seen_at")
    .eq("scope", scope)
    .eq("subject_id", subjectId)
    .order("weight", { ascending: false })
    .limit(50);
  return (data ?? []) as MemoryRow[];
}
