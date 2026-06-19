import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Product } from "@/lib/products";
import {
  pharmacyHomepageSections,
  pharmacyChronicIds,
  pharmacyRelatedProducts,
  pharmacySearch,
  type HomepageSection,
  type RelatedBuckets,
  type SearchHit,
} from "@/lib/pharmacy-public.functions";

/** Lookup map: DB legacy_id -> merged Product. */
export function useLegacyMap(products: Product[]): Map<number, Product> {
  return useMemo(() => {
    const m = new Map<number, Product>();
    for (const p of products) if (p.legacyId != null) m.set(p.legacyId, p);
    return m;
  }, [products]);
}

export function useHomepageSections() {
  const fn = useServerFn(pharmacyHomepageSections);
  const [data, setData] = useState<HomepageSection[]>([]);
  useEffect(() => { fn().then((r) => setData(r as HomepageSection[])).catch(() => {}); }, [fn]);
  return data;
}

export function useChronicIds(): Set<number> {
  const fn = useServerFn(pharmacyChronicIds);
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => { fn().then((r) => setIds(r as number[])).catch(() => {}); }, [fn]);
  return useMemo(() => new Set(ids), [ids]);
}

export function useRelatedProducts(legacyId: number | undefined) {
  const fn = useServerFn(pharmacyRelatedProducts);
  const [buckets, setBuckets] = useState<RelatedBuckets | null>(null);
  useEffect(() => {
    if (!legacyId) { setBuckets(null); return; }
    fn({ data: { legacy_id: legacyId } })
      .then((r) => setBuckets(r as RelatedBuckets))
      .catch(() => setBuckets(null));
  }, [legacyId, fn]);
  return buckets;
}

export function useSmartSearch(query: string) {
  const fn = useServerFn(pharmacySearch);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fn({ data: { q } })
        .then((r) => setHits(r as SearchHit[]))
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, fn]);
  return { hits, loading };
}

export const REASON_LABELS: Record<string, string> = {
  condition: "حالة مرضية",
  generic: "اسم علمي",
  active_ingredient: "مادة فعالة",
  drug_class: "تصنيف دوائي",
  category: "فئة علاجية",
  name: "اسم المنتج",
  brand: "ماركة",
};
