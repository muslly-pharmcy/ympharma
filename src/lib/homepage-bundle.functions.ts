// Single fan-out RPC for the homepage. Collapses four client→server
// round-trips (products, image overrides, banners, intel sections) into one,
// reducing perceived LCP on high-latency networks (YemenNet / TeleYemen).
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

export type HomepageBundle = {
  products: any[];
  overrides: { dedupe_key: string; image_url: string; source: string }[];
  banners: {
    id: string;
    title: string;
    subtitle: string | null;
    cta_label: string | null;
    cta_href: string | null;
    theme: string;
    image_url: string | null;
    placement: string;
  }[];
  sections: { category: string; label: string; count: number; legacy_ids: number[] }[];
};

export const getHomepageBundle = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ productLimit: z.number().int().min(1).max(500).optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<HomepageBundle> => {
    const sb = sbPublic();
    const limit = data?.productLimit ?? 500;

    const [productsRes, overridesRes, bannersRes, sectionsRes] = await Promise.all([
      sb
        .from("products")
        .select("id,legacy_id,name,brand,price,old_price,category,image_url,badge,description,is_published,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit),
      sb
        .from("product_image_overrides")
        .select("dedupe_key,image_url,source")
        .eq("found", true),
      sb
        .from("marketing_banners")
        .select("id,title,subtitle,cta_label,cta_href,theme,image_url,placement,sort_order")
        .eq("placement", "home")
        .order("sort_order"),
      sb.rpc("pharmacy_homepage_sections"),
    ]);

    return {
      products: productsRes.data ?? [],
      overrides: (overridesRes.data ?? []) as HomepageBundle["overrides"],
      banners: (bannersRes.data ?? []) as HomepageBundle["banners"],
      sections: (sectionsRes.data ?? []) as HomepageBundle["sections"],
    };
  });
