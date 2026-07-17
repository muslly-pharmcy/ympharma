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

const CheckInput = z.object({
  medicineSlugs: z.array(z.string()).min(1).max(20),
});

export type InteractionRow = {
  severity: "minor" | "moderate" | "major" | "contraindicated";
  mechanism: string | null;
  clinical_effect_ar: string | null;
  recommendation_ar: string | null;
  drug_a: { slug: string; name_ar: string };
  drug_b: { slug: string; name_ar: string };
};

export const checkDrugInteractions = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data }) => {
    const c = publicClient();
    const { data: meds } = await c
      .from("medical_entities")
      .select("id, slug, name_ar")
      .eq("entity_type", "MEDICINE")
      .in("slug", data.medicineSlugs);
    const ids = (meds ?? []).map((m) => m.id);
    if (ids.length < 2) return { interactions: [] as InteractionRow[], unknown: data.medicineSlugs.filter((s) => !meds?.some((m) => m.slug === s)) };

    const { data: rows, error } = await c
      .from("drug_interactions")
      .select("severity, mechanism, clinical_effect_ar, recommendation_ar, drug_a:medical_entities!drug_interactions_drug_a_id_fkey(slug, name_ar), drug_b:medical_entities!drug_interactions_drug_b_id_fkey(slug, name_ar)")
      .in("drug_a_id", ids)
      .in("drug_b_id", ids);
    if (error) throw new Error(error.message);

    const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
    const interactions = ((rows ?? []) as unknown as InteractionRow[]).sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );
    return {
      interactions,
      unknown: data.medicineSlugs.filter((s) => !meds?.some((m) => m.slug === s)),
    };
  });

const InfoInput = z.object({ slug: z.string() });
export const getDrugInfo = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => InfoInput.parse(input))
  .handler(async ({ data }) => {
    const c = publicClient();
    const { data: drug } = await c
      .from("medical_entities")
      .select("id, slug, name_ar, name_en, synonyms, description_ar, atc_code")
      .eq("entity_type", "MEDICINE")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!drug) return { drug: null };
    const { data: treats } = await c
      .from("medical_relationships")
      .select("target:medical_entities!medical_relationships_target_id_fkey(slug, name_ar)")
      .eq("source_id", drug.id)
      .eq("relationship_type", "treats");
    return { drug, treats: treats ?? [] };
  });
