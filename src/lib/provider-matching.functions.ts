import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { symptomsToSpecialties } from "./knowledge-graph.functions";

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

const RankInput = z.object({
  specialtySlug: z.string().optional(),
  limit: z.number().int().min(1).max(30).default(10),
});

export const rankProvidersForSpecialty = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => RankInput.parse(input))
  .handler(async ({ data }) => {
    const c = publicClient();
    let doctorIds: string[] | null = null;

    if (data.specialtySlug) {
      const { data: spec } = await c
        .from("hc_specialties")
        .select("id")
        .eq("code", data.specialtySlug)
        .maybeSingle();
      if (spec) {
        const { data: links } = await c
          .from("hc_doctor_specialties")
          .select("doctor_id")
          .eq("specialty_id", spec.id);
        doctorIds = (links ?? []).map((l) => l.doctor_id);
        if (doctorIds.length === 0) return { doctors: [] };
      }
    }

    let q = c
      .from("hc_doctors")
      .select("id, slug, full_name_ar, full_name_en, title, photo_url, years_experience, verification_status, telemedicine_ready, consultation_fee_min, consultation_fee_max, currency")
      .eq("is_public", true)
      .limit(data.limit);
    if (doctorIds) q = q.in("id", doctorIds);

    const { data: doctors } = await q;
    const ids = (doctors ?? []).map((d) => d.id);
    if (ids.length === 0) return { doctors: [] };

    const { data: scores } = await c
      .from("provider_ranking_scores")
      .select("provider_id, score, level, rating, reviews_count")
      .eq("provider_kind", "doctor")
      .in("provider_id", ids);
    const scoreMap = new Map(((scores ?? []) as { provider_id: string; score: number; level: string; rating: number | null; reviews_count: number | null }[]).map((s) => [s.provider_id, s]));

    const enriched = (doctors ?? [])
      .map((d) => ({
        ...d,
        rank: scoreMap.get(d.id) ?? { score: 0, level: "NEW_PROVIDER", rating: null, reviews_count: 0 },
      }))
      .sort((a, b) => b.rank.score - a.rank.score);

    return { doctors: enriched };
  });

const MatchInput = z.object({
  symptomSlugs: z.array(z.string()).min(1).max(10),
  limit: z.number().int().min(1).max(20).default(6),
});

type SpecialtyBlock = {
  slug: string;
  name_ar: string | null;
  name_en: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doctors: any[];
};

export const matchProvidersForSymptoms = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data }): Promise<{
    suggestedSpecialties: SpecialtyBlock[];
    possibleDiseases: Array<{ slug?: string; name_ar?: string | null; name_en?: string | null; score: number }>;
  }> => {
    const sp = await symptomsToSpecialties({ data: { symptomSlugs: data.symptomSlugs } });
    const top = sp.specialties.slice(0, 3) as unknown as Array<{
      slug: string;
      name_ar: string | null;
      name_en: string | null;
    }>;

    const blocks: SpecialtyBlock[] = [];
    for (const s of top) {
      const r = await rankProvidersForSpecialty({ data: { specialtySlug: s.slug, limit: data.limit } });
      blocks.push({ slug: s.slug, name_ar: s.name_ar, name_en: s.name_en, doctors: r.doctors });
    }

    return {
      suggestedSpecialties: blocks,
      possibleDiseases: sp.diseases as unknown as Array<{
        slug?: string;
        name_ar?: string | null;
        name_en?: string | null;
        score: number;
      }>,
    };
  });
