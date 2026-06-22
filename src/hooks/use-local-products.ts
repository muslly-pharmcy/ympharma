// Locally-cached product overrides (e.g. items added manually in-browser).
// Returns an empty list by default; extend with localStorage logic if needed.
import { useMemo } from "react";

export type LocalProduct = {
  id?: string;
  name?: string;
  supplier_name?: string;
  category?: string;
  stock_qty?: number;
  price?: number;
};

export function useLocalProducts() {
  const localProducts = useMemo<LocalProduct[]>(() => [], []);
  return { localProducts };
}
