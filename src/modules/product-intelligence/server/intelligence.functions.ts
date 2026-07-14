// Phoenix P7-A — public medicine search via RPC (exact + alias + fuzzy).
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SearchQuerySchema } from "../domain/schemas";
import type { SearchHit } from "../domain/types";
import { compareHits } from "../domain/aliases";

function serverPublicClient() {
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

export const searchMedicinesIntelligent = createServerFn({ method: "POST" })
  .inputValidator((input) => SearchQuerySchema.parse(input))
  .handler(async ({ data }): Promise<SearchHit[]> => {
    if (!data.q.trim()) return [];
    const supabase = serverPublicClient();
    const { data: rows, error } = await supabase.rpc(
      // Type cast — RPC name is not in generated types yet.
      "search_medicines_public" as never,
      { _q: data.q, _limit: data.limit } as never,
    );
    if (error) {
      console.error("[searchMedicinesIntelligent] rpc error", error.message);
      return [];
    }
    const hits = ((rows ?? []) as unknown as SearchHit[]).slice();
    hits.sort(compareHits);
    return hits;
  });
