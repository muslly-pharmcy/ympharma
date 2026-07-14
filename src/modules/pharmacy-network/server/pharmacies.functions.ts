// Phoenix Pharmacy Network — public discovery server functions.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { PnSearchHit } from "../domain/types";

function sbPublic() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
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

const SearchSchema = z.object({
  q: z.string().max(120).default(""),
  lat: z.number().finite().optional().nullable(),
  lng: z.number().finite().optional().nullable(),
  radius_km: z.number().int().min(1).max(200).default(25),
  limit: z.number().int().min(1).max(100).default(50),
});

export const pnSearchMedicineNearby = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SearchSchema.parse(i))
  .handler(async ({ data }): Promise<PnSearchHit[]> => {
    const { data: rows, error } = await sbPublic().rpc(
      "pn_search_medicine_nearby" as never,
      {
        _q: data.q,
        _lat: data.lat ?? null,
        _lng: data.lng ?? null,
        _radius_km: data.radius_km,
        _limit: data.limit,
      } as never,
    );
    if (error) {
      console.error("[pnSearchMedicineNearby]", error.message);
      return [];
    }
    return ((rows ?? []) as unknown as PnSearchHit[]);
  });

const SlugSchema = z.object({ slug: z.string().min(1).max(160) });

export const pnGetPharmacyPublic = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SlugSchema.parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await sbPublic().rpc(
      "pn_get_pharmacy_public" as never,
      { _slug: data.slug } as never,
    );
    if (error) {
      console.error("[pnGetPharmacyPublic]", error.message);
      return null;
    }
    return (row as unknown) ?? null;
  });

const ListSchema = z.object({
  slug: z.string().min(1).max(160),
  q: z.string().max(120).default(""),
  limit: z.number().int().min(1).max(200).default(100),
  offset: z.number().int().min(0).default(0),
});

export interface PnProductRow {
  catalog_product_id: string;
  product_name: string;
  availability: "in_stock" | "low" | "out";
  price_yer: number | null;
  price_visible: boolean;
  expiry_date: string | null;
}

export const pnListPharmacyProducts = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ListSchema.parse(i))
  .handler(async ({ data }): Promise<PnProductRow[]> => {
    const { data: rows, error } = await sbPublic().rpc(
      "pn_list_pharmacy_products" as never,
      { _slug: data.slug, _q: data.q, _limit: data.limit, _offset: data.offset } as never,
    );
    if (error) {
      console.error("[pnListPharmacyProducts]", error.message);
      return [];
    }
    return ((rows ?? []) as unknown as PnProductRow[]);
  });
