import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function sbPublic() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type SearchHit = { legacy_id: number; reasons: string[]; rank: number };

export const pharmacySearch = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ q: z.string().max(120) }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await sbPublic().rpc("pharmacy_search", { _q: data.q });
    if (error) return [] as SearchHit[];
    return (rows as SearchHit[]) ?? [];
  });

export type HomepageSection = {
  category: string;
  label: string;
  count: number;
  legacy_ids: number[];
};

export const pharmacyHomepageSections = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await sbPublic().rpc("pharmacy_homepage_sections");
    if (error) return [] as HomepageSection[];
    return (data as HomepageSection[]) ?? [];
  });

export type RelatedBuckets = {
  same_condition: number[];
  same_class: number[];
  explicit: number[];
  copurchase: number[];
};

export const pharmacyRelatedProducts = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ legacy_id: z.number().int() }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await sbPublic().rpc("pharmacy_related_products", {
      _legacy_id: data.legacy_id,
    });
    if (error) {
      return { same_condition: [], same_class: [], explicit: [], copurchase: [] } as RelatedBuckets;
    }
    return (row as RelatedBuckets) ?? {
      same_condition: [], same_class: [], explicit: [], copurchase: [],
    };
  });

export const pharmacyChronicIds = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await sbPublic().rpc("pharmacy_chronic_legacy_ids");
    if (error) return [] as number[];
    return (data as number[]) ?? [];
  });
