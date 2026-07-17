import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SearchInput = z.object({
  q: z.string().min(1).max(120),
  entityType: z.enum(["DISEASE", "SYMPTOM", "MEDICINE", "PROCEDURE", "LAB_TEST", "SPECIALTY"]).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const searchEntities = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }) => {
    const c = publicClient();
    let qb = c
      .from("medical_entities")
      .select("id, entity_type, slug, name_ar, name_en, synonyms, description_ar")
      .limit(data.limit);
    if (data.entityType) qb = qb.eq("entity_type", data.entityType);
    const term = data.q.trim();
    qb = qb.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%,slug.ilike.%${term}%`);
    const { data: rows, error } = await qb;
    if (error) throw new Error(error.message);
    return { results: rows ?? [] };
  });

const GetInput = z.object({ slug: z.string(), entityType: z.string().optional() });

export const getEntityWithNeighbors = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => GetInput.parse(input))
  .handler(async ({ data }) => {
    const c = publicClient();
    let q = c.from("medical_entities").select("*").eq("slug", data.slug);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    const { data: entity } = await q.maybeSingle();
    if (!entity) return { entity: null, outgoing: [], incoming: [] };

    const [{ data: outgoing }, { data: incoming }] = await Promise.all([
      c
        .from("medical_relationships")
        .select("relationship_type, confidence, target:medical_entities!medical_relationships_target_id_fkey(id, entity_type, slug, name_ar, name_en)")
        .eq("source_id", entity.id),
      c
        .from("medical_relationships")
        .select("relationship_type, confidence, source:medical_entities!medical_relationships_source_id_fkey(id, entity_type, slug, name_ar, name_en)")
        .eq("target_id", entity.id),
    ]);

    return { entity, outgoing: outgoing ?? [], incoming: incoming ?? [] };
  });

const SymptomsInput = z.object({ symptomSlugs: z.array(z.string()).min(1).max(10) });

export const symptomsToSpecialties = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SymptomsInput.parse(input))
  .handler(async ({ data }) => {
    const c = publicClient();
    const { data: symptoms } = await c
      .from("medical_entities")
      .select("id")
      .eq("entity_type", "SYMPTOM")
      .in("slug", data.symptomSlugs);
    const symIds = (symptoms ?? []).map((s) => s.id);
    if (symIds.length === 0) return { specialties: [], diseases: [] };

    const [{ data: rels }, { data: diseaseRels }] = await Promise.all([
      c
        .from("medical_relationships")
        .select("target_id, confidence, target:medical_entities!medical_relationships_target_id_fkey(id, entity_type, slug, name_ar, name_en)")
        .eq("relationship_type", "specialist_for")
        .in("source_id", symIds),
      c
        .from("medical_relationships")
        .select("target_id, confidence, target:medical_entities!medical_relationships_target_id_fkey(id, entity_type, slug, name_ar, name_en)")
        .eq("relationship_type", "symptom_of")
        .in("source_id", symIds),
    ]);

    // Aggregate specialties by score
    const specScore = new Map<string, { entity: unknown; score: number; count: number }>();
    for (const r of rels ?? []) {
      const t = r.target as { id?: string } | null;
      if (!t?.id) continue;
      const cur = specScore.get(t.id) ?? { entity: t, score: 0, count: 0 };
      cur.score += Number(r.confidence ?? 0);
      cur.count += 1;
      specScore.set(t.id, cur);
    }
    const specialties = [...specScore.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => ({ ...(s.entity as object), score: s.score, matches: s.count }));

    const disMap = new Map<string, { entity: unknown; score: number }>();
    for (const r of diseaseRels ?? []) {
      const t = r.target as { id?: string } | null;
      if (!t?.id) continue;
      const cur = disMap.get(t.id) ?? { entity: t, score: 0 };
      cur.score += Number(r.confidence ?? 0);
      disMap.set(t.id, cur);
    }
    const diseases = [...disMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((d) => ({ ...(d.entity as object), score: d.score }));

    return { specialties, diseases };
  });
