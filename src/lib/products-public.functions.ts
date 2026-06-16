import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("products")
    .select("id,name,brand,price,old_price,category,image_url,badge,description,is_published")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
});
