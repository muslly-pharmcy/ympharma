// Phoenix Phase 4 — Catalog server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PermissionService } from "@/platform/permissions";
import {
  CreateProductSchema,
  UpdateProductSchema,
  AliasSchema,
  SearchInputSchema,
  BarcodeLookupSchema,
} from "../domain/schemas";
import type { CatalogProduct, SearchHit } from "../domain/types";

const TABLE = "catalog_products" as const;

export const listCatalogProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orgId: z.string().uuid(),
        status: z
          .enum(["draft", "pending_review", "approved", "rejected", "archived"])
          .nullable()
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CatalogProduct[]> => {
    await PermissionService.require(context.userId, "catalog.read", { orgId: data.orgId });
    let q = context.supabase
      .from(TABLE as never)
      .select("*")
      .eq("organization_id", data.orgId)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as unknown as CatalogProduct[];
  });

export const getCatalogProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CatalogProduct | null> => {
    const { data: row, error } = await context.supabase
      .from(TABLE as never)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return (row ?? null) as unknown as CatalogProduct | null;
  });

export const createCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateProductSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await PermissionService.require(context.userId, "catalog.write", {
      orgId: data.organization_id,
    });
    const { data: row, error } = await context.supabase
      .from(TABLE as never)
      .insert({ ...data, created_by: context.userId, owner_org_id: data.organization_id } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });

export const updateCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateProductSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { id, ...patch } = data;
    // Look up org to guard perm
    const { data: existing, error: e0 } = await context.supabase
      .from(TABLE as never)
      .select("organization_id")
      .eq("id", id)
      .single();
    if (e0) throw e0;
    const orgId = (existing as { organization_id: string }).organization_id;
    await PermissionService.require(context.userId, "catalog.write", { orgId });
    const { error } = await context.supabase
      .from(TABLE as never)
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

async function transitionStatus(
  ctxSupabase: ReturnType<typeof requireCtx>,
  userId: string,
  id: string,
  next: "pending_review" | "approved" | "rejected",
  permission: "catalog.write" | "catalog.verify",
) {
  const { data: existing, error: e0 } = await ctxSupabase
    .from(TABLE as never)
    .select("organization_id")
    .eq("id", id)
    .single();
  if (e0) throw e0;
  const orgId = (existing as { organization_id: string }).organization_id;
  await PermissionService.require(userId, permission, { orgId });
  const patch: Record<string, unknown> = { status: next };
  if (next === "approved") {
    patch.verified_at = new Date().toISOString();
    patch.verified_by = userId;
    patch.is_public = true;
  }
  const { error } = await ctxSupabase.from(TABLE as never).update(patch as never).eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

// helper type
function requireCtx<T>(x: T): T {
  return x;
}

export const submitForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(({ data, context }) =>
    transitionStatus(context.supabase, context.userId, data.id, "pending_review", "catalog.write"),
  );

export const verifyCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(({ data, context }) =>
    transitionStatus(context.supabase, context.userId, data.id, "approved", "catalog.verify"),
  );

export const rejectCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(({ data, context }) =>
    transitionStatus(context.supabase, context.userId, data.id, "rejected", "catalog.verify"),
  );

export const addProductAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AliasSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    // Perm check via parent product's org
    const { data: prod, error: e0 } = await context.supabase
      .from(TABLE as never)
      .select("organization_id")
      .eq("id", data.productId)
      .single();
    if (e0) throw e0;
    await PermissionService.require(context.userId, "catalog.write", {
      orgId: (prod as { organization_id: string }).organization_id,
    });
    const { data: row, error } = await context.supabase
      .from("catalog_product_aliases" as never)
      .insert({
        product_id: data.productId,
        alias: data.alias,
        locale: data.locale,
        source: data.source,
        confidence: data.confidence ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });

export const searchCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SearchInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<SearchHit[]> => {
    const { data: rows, error } = await context.supabase.rpc("catalog_search" as never, {
      _q: data.q,
      _org_id: data.orgId ?? null,
      _limit: data.limit,
    } as never);
    if (error) throw error;
    return (rows ?? []) as unknown as SearchHit[];
  });

export const lookupByBarcode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BarcodeLookupSchema.parse(input))
  .handler(async ({ data, context }): Promise<CatalogProduct | null> => {
    const { data: bc, error } = await context.supabase
      .from("catalog_barcodes" as never)
      .select("product_id")
      .eq("barcode", data.barcode)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!bc) return null;
    const { data: prod, error: e2 } = await context.supabase
      .from(TABLE as never)
      .select("*")
      .eq("id", (bc as { product_id: string }).product_id)
      .maybeSingle();
    if (e2) throw e2;
    return (prod ?? null) as unknown as CatalogProduct | null;
  });
