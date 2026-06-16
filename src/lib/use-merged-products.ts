import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { products as staticProducts, type Product } from "@/lib/products";
import { listPublicProducts } from "@/lib/products-public.functions";

// Maps a DB row to the storefront Product shape.
function mapRow(r: any, idx: number): Product {
  return {
    id: 100000 + idx, // numeric id space distinct from static catalog
    name: r.name,
    brand: r.brand ?? "",
    price: Number(r.price) || 0,
    oldPrice: r.old_price ? Number(r.old_price) : undefined,
    cat: r.category,
    img: r.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500",
    badge: r.badge ?? undefined,
    desc: r.description ?? undefined,
  };
}

/**
 * Returns DB-published products merged with the static catalog.
 * DB products appear first (newest), then static fallback products.
 */
export function useMergedProducts(): Product[] {
  const fetchFn = useServerFn(listPublicProducts);
  const [dbItems, setDbItems] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchFn()
      .then((rows: any[]) => { if (!cancelled) setDbItems((rows ?? []).map(mapRow)); })
      .catch(() => { /* fail silently — static catalog still renders */ });
    return () => { cancelled = true; };
  }, [fetchFn]);

  return [...dbItems, ...staticProducts];
}
