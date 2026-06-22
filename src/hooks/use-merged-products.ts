// Merge server products with local-only items, then filter + sort.
import { useMemo } from "react";
import { useLocalProducts, type LocalProduct } from "./use-local-products";

export type SortBy = "stock_desc" | "supplier_asc" | "price_asc" | "name_asc";

type AnyProduct = LocalProduct & Record<string, unknown>;

export function useMergedProducts(
  serverProducts: AnyProduct[],
  sortBy: SortBy = "stock_desc",
  searchQuery = "",
) {
  const { localProducts } = useLocalProducts();

  return useMemo(() => {
    const merged: AnyProduct[] = [...(serverProducts ?? []), ...localProducts];
    const unique = merged.filter(
      (p, i, self) => i === self.findIndex((q) => (q.id && q.id === p.id) || q.name === p.name),
    );

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? unique.filter((p) =>
          [p.name, p.supplier_name, p.category].some((v) =>
            String(v ?? "").toLowerCase().includes(q),
          ),
        )
      : unique;

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "stock_desc":
          return (Number(b.stock_qty) || 0) - (Number(a.stock_qty) || 0);
        case "supplier_asc":
          return String(a.supplier_name ?? "").localeCompare(String(b.supplier_name ?? ""), "ar");
        case "price_asc":
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        case "name_asc":
          return String(a.name ?? "").localeCompare(String(b.name ?? ""), "ar");
        default:
          return 0;
      }
    });

    return { mergedProducts: sorted, totalCount: sorted.length };
  }, [serverProducts, localProducts, sortBy, searchQuery]);
}
