// Single-shot homepage hook. Wraps getHomepageBundle and exposes the same
// shapes the existing homepage components expect (Product[], sections, etc.)
// so we can swap out useMergedProducts + useHomepageSections + the banner's
// internal fetch in one place.
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { products as staticProducts, type Product } from "@/lib/products";
import { importedProducts } from "@/lib/products-extra";
import {
  dedupeProductsWithSummary,
  productDedupeKey,
} from "@/lib/use-merged-products";
import { getHomepageBundle, type HomepageBundle } from "@/lib/homepage-bundle.functions";

function mapRow(r: any, idx: number): Product {
  return {
    id: 100000 + idx,
    name: r.name,
    brand: r.brand ?? "",
    price: Number(r.price) || 0,
    oldPrice: r.old_price ? Number(r.old_price) : undefined,
    cat: r.category,
    img: r.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
    badge: r.badge ?? undefined,
    desc: r.description ?? undefined,
    legacyId: typeof r.legacy_id === "number" ? r.legacy_id : undefined,
  };
}

export function useHomepageBundle() {
  const fn = useServerFn(getHomepageBundle);
  const [bundle, setBundle] = useState<HomepageBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    fn({ data: { productLimit: 500 } })
      .then((b) => { if (!cancelled) setBundle(b as HomepageBundle); })
      .catch(() => { /* static catalog still renders */ });
    return () => { cancelled = true; };
  }, [fn]);

  const products = useMemo<Product[]>(() => {
    const dbItems = (bundle?.products ?? []).map(mapRow);
    const { items } = dedupeProductsWithSummary(dbItems, staticProducts, importedProducts);
    const overrides = bundle?.overrides ?? [];
    if (overrides.length === 0) return items;
    const m = new Map<string, string>();
    for (const r of overrides) if (r.image_url) m.set(r.dedupe_key, r.image_url);
    return items.map((p) => {
      const ov = m.get(productDedupeKey(p));
      return ov ? { ...p, img: ov } : p;
    });
  }, [bundle]);

  return {
    products,
    sections: bundle?.sections ?? [],
    banners: bundle?.banners ?? [],
    ready: bundle !== null,
  };
}
