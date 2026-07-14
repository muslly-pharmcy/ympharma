// Phoenix P7-A — authenticated alias management.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AliasInputSchema, VerifyAliasSchema } from "../domain/schemas";
import { normalize } from "../domain/normalize";

export const listAliases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("catalog_product_aliases" as never)
      .select("*")
      .eq("product_id", data.productId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return rows ?? [];
  });

export const addAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AliasInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const alias_normalized = normalize(data.alias);
    if (!alias_normalized) throw new Error("Empty alias after normalization");
    const { data: row, error } = await context.supabase
      .from("catalog_product_aliases" as never)
      .insert({
        product_id: data.productId,
        alias: data.alias,
        alias_normalized,
        locale: data.locale,
        source: data.source,
        confidence: data.confidence ?? null,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const verifyAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifyAliasSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("catalog_product_aliases" as never)
      .update({ confidence: data.confidence, source: "verified" } as never)
      .eq("id", data.aliasId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });
