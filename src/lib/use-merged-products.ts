import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { products as staticProducts, type Product } from "@/lib/products";
import { importedProducts } from "@/lib/products-extra";
import { listPublicProducts } from "@/lib/products-public.functions";
import { listImageOverrides } from "@/lib/product-images.functions";

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
    legacyId: typeof r.legacy_id === "number" ? r.legacy_id : undefined,
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
 * Per-list dedupe stats — useful for reporting how many items came from each
 * source (e.g. re-importing the Excel file).
 */
export type DedupeListStat = {
  total: number;        // items in this list
  added: number;        // new unique items contributed
  duplicates: number;   // skipped because already seen
  byCode: number;       // duplicates matched by internal code
  byName: number;       // duplicates matched by normalized name
};

export type DedupeSummary = {
  totalIn: number;
  totalOut: number;
  duplicates: number;
  perList: DedupeListStat[];
};

/**
 * Merge several product lists, dropping duplicates (case-insensitive, code-aware).
 * Earlier lists take precedence over later ones. Returns both the merged list
 * and a breakdown of how many items each list added vs. deduped (and by which key).
 */
export function dedupeProductsWithSummary(
  ...lists: Product[][]
): { items: Product[]; summary: DedupeSummary } {
  const seen = new Set<string>();
  const out: Product[] = [];
  const perList: DedupeListStat[] = [];
  for (const list of lists) {
    const stat: DedupeListStat = { total: list.length, added: 0, duplicates: 0, byCode: 0, byName: 0 };
    for (const p of list) {
      const key = productDedupeKey(p);
      if (seen.has(key)) {
        stat.duplicates++;
        if (key.startsWith("code:")) stat.byCode++; else stat.byName++;
        continue;
      }
      seen.add(key);
      out.push(p);
      stat.added++;
    }
    perList.push(stat);
  }
  const totalIn = perList.reduce((s, x) => s + x.total, 0);
  return {
    items: out,
    summary: { totalIn, totalOut: out.length, duplicates: totalIn - out.length, perList },
  };
}

/**
 * Backwards-compatible thin wrapper that returns just the merged items.
 */
export function dedupeProducts(...lists: Product[][]): Product[] {
  return dedupeProductsWithSummary(...lists).items;
}

/**
 * Returns DB-published products merged with the static catalog + imported Excel,
 * plus an import summary describing how many items each source contributed
 * (and how many were skipped as duplicates, by which key).
 */
export function useMergedProducts(): Product[] & { importSummary?: DedupeSummary } {
  const fetchFn = useServerFn(listPublicProducts);
  const fetchOverrides = useServerFn(listImageOverrides);
  const [dbItems, setDbItems] = useState<Product[]>([]);
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetchFn()
      .then((rows: any[]) => { if (!cancelled) setDbItems((rows ?? []).map(mapRow)); })
      .catch(() => { /* fail silently — static catalog still renders */ });
    fetchOverrides()
      .then((rows) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const r of rows) if (r.image_url) m.set(r.dedupe_key, r.image_url);
        setOverrides(m);
      })
      .catch(() => { /* not critical */ });
    return () => { cancelled = true; };
  }, [fetchFn, fetchOverrides]);

  const { items, summary } = dedupeProductsWithSummary(dbItems, staticProducts, importedProducts);
  // Apply image overrides keyed by dedupe key.
  const final = overrides.size === 0
    ? items
    : items.map((p) => {
        const key = productDedupeKey(p);
        const ov = overrides.get(key);
        return ov ? { ...p, img: ov } : p;
      });
  Object.defineProperty(final, "importSummary", { value: summary, enumerable: false });
  return final as Product[] & { importSummary: DedupeSummary };
}
