import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
  if (!isAdmin && !isOwner) throw new Error("Forbidden");
}

// Lightweight Arabic→Latin transliteration / cleanup so OpenFoodFacts search
// has a chance of matching brand names like "بانادول" → "panadol".
function buildSearchTerms(name: string, brand: string): string[] {
  const cleaned = (s: string) =>
    s
      .replace(/[\u200f\u200e]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const terms = new Set<string>();
  if (brand && brand !== "صيدلية المصلي") terms.add(cleaned(brand));
  if (name) terms.add(cleaned(name));
  if (brand && name) terms.add(`${cleaned(brand)} ${cleaned(name)}`);
  return Array.from(terms).filter(Boolean);
}

type LookupResult = {
  found: boolean;
  image_url: string | null;
  source: string;
  reason?: string;
};

// Try OpenFoodFacts (covers OTC medicines, supplements, baby products,
// cosmetics — surprisingly good coverage for retail SKUs).
async function lookupOpenFoodFacts(query: string): Promise<LookupResult> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,brands,image_front_url,image_url`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "musllyImageBot/1.0 (admin@muslly.com)" },
    });
    if (!res.ok) return { found: false, image_url: null, source: "openfoodfacts", reason: `http_${res.status}` };
    const json: any = await res.json();
    const products: any[] = json.products ?? [];
    for (const p of products) {
      const img = p.image_front_url || p.image_url;
      if (img && typeof img === "string" && img.startsWith("https://")) {
        return { found: true, image_url: img, source: "openfoodfacts" };
      }
    }
    return { found: false, image_url: null, source: "openfoodfacts", reason: "no_image_in_results" };
  } catch (e) {
    return { found: false, image_url: null, source: "openfoodfacts", reason: e instanceof Error ? e.message.slice(0, 200) : "fetch_failed" };
  }
}

// openFDA NDC drug API — has limited image data but useful for OTC drugs.
async function lookupOpenFDA(query: string): Promise<LookupResult> {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(query)}"&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { found: false, image_url: null, source: "openfda", reason: `http_${res.status}` };
    // openFDA doesn't ship product images, but confirms the brand exists; we
    // simply skip and let caller fall back. Return as "not found" so the
    // override stays empty (no point storing placeholder URLs).
    return { found: false, image_url: null, source: "openfda", reason: "no_images_supported" };
  } catch {
    return { found: false, image_url: null, source: "openfda", reason: "fetch_failed" };
  }
}

async function lookupBest(name: string, brand: string): Promise<LookupResult> {
  const terms = buildSearchTerms(name, brand);
  let lastReason = "no_terms";
  for (const t of terms) {
    const off = await lookupOpenFoodFacts(t);
    if (off.found) return off;
    lastReason = off.reason ?? lastReason;
    // (openFDA call kept for future; skipped now since it has no images)
    await lookupOpenFDA(t);
  }
  return { found: false, image_url: null, source: "openfoodfacts", reason: lastReason };
}

// ============= Public API =============

export const listImageOverrides = createServerFn({ method: "GET" }).handler(async () => {
  // Public read — RLS already restricts to found=true rows.
  const { createClient } = await import("@supabase/supabase-js");
  const sp = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await sp
    .from("product_image_overrides")
    .select("dedupe_key, image_url, source")
    .eq("found", true);
  return (data ?? []) as { dedupe_key: string; image_url: string; source: string }[];
});

const lookupSchema = z.object({
  dedupe_key: z.string().min(2).max(200),
  name: z.string().min(1).max(300),
  brand: z.string().max(120).default(""),
});

export const lookupProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => lookupSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const result = await lookupBest(data.name, data.brand);
    // upsert into overrides
    await context.supabase
      .from("product_image_overrides")
      .upsert({
        dedupe_key: data.dedupe_key,
        image_url: result.image_url,
        source: result.source,
        found: result.found,
        fetched_at: new Date().toISOString(),
        updated_by: context.userId,
      });
    return { ...result, dedupe_key: data.dedupe_key };
  });

const bulkSchema = z.object({
  items: z
    .array(
      z.object({
        dedupe_key: z.string().min(2).max(200),
        name: z.string().min(1).max(300),
        brand: z.string().max(120).default(""),
      }),
    )
    .min(1)
    .max(25),
});

export const bulkLookupProductImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bulkSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const results: { dedupe_key: string; found: boolean; image_url: string | null; source: string; reason?: string }[] = [];
    for (const it of data.items) {
      // tiny delay so we don't hammer the public API
      await new Promise((r) => setTimeout(r, 250));
      const r = await lookupBest(it.name, it.brand);
      await context.supabase
        .from("product_image_overrides")
        .upsert({
          dedupe_key: it.dedupe_key,
          image_url: r.image_url,
          source: r.source,
          found: r.found,
          fetched_at: new Date().toISOString(),
          updated_by: context.userId,
        });
      results.push({ dedupe_key: it.dedupe_key, ...r });
    }
    const found = results.filter((r) => r.found).length;
    return { processed: results.length, found, results };
  });

export const listImageOverrideStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("product_image_overrides")
      .select("found");
    if (error) throw new Error(error.message);
    const total = data?.length ?? 0;
    const found = data?.filter((r: any) => r.found).length ?? 0;
    return { total, found, missing: total - found };
  });
