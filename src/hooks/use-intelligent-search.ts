import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchMedicinesIntelligent } from "@/modules/product-intelligence/functions/intelligence.functions";
import type { SearchHit } from "@/modules/product-intelligence/domain/types";
import { canonicalQuery } from "@/modules/product-intelligence/domain/normalize";

/**
 * Phoenix Product Intelligence — client hook wrapping the public RPC.
 * Exact → Normalized → Alias → Fuzzy ranking is applied server-side.
 * Debounced (250ms) to match existing useSmartSearch UX.
 */
export function useIntelligentSearch(query: string, limit = 20) {
  const fn = useServerFn(searchMedicinesIntelligent);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const canonical = useMemo(() => canonicalQuery(query), [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fn({ data: { q, limit } })
        .then((r) => setHits(r ?? []))
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, limit, fn]);

  return { hits, loading, canonical };
}
