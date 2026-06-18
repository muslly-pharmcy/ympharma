import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { products as staticProducts, type Product } from "@/lib/products";
import { importedProducts } from "@/lib/products-extra";
import { listPublicProducts } from "@/lib/products-public.functions";

// Maps a DB row to the storefront Product shape.
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
  };
}

/**
 * Normalize a product into a dedupe key:
 *  - prefer the internal code embedded in the description (الكود: 0125618)
 *  - else fall back to a normalized name (collapsed spaces, lower-case)
 */
export function productDedupeKey(p: Pick<Product, "name" | "desc">): string {
  const codeMatch = (p.desc ?? "").match(/الكود[:\s]*([0-9A-Za-z\-]+)/);
  if (codeMatch) return `code:${codeMatch[1].trim().toLowerCase()}`;
  const norm = (p.name ?? "")
    .toLowerCase()
    .replace(/[\u200f\u200e]/g, "") // RTL/LTR marks
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return `name:${norm}`;
}

/**
 * Merge several product lists, dropping duplicates (case-insensitive, code-aware).
 * Earlier lists take precedence over later ones.
 */
export function dedupeProducts(...lists: Product[][]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = productDedupeKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

/**
 * Returns DB-published products merged with the static catalog + imported Excel.
 * DB products take precedence; imported Excel rows are deduplicated against both
 * DB and the static catalog so re-importing the same sheet never creates copies.
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

  return dedupeProducts(dbItems, staticProducts, importedProducts);
}
