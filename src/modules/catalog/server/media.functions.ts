// Phoenix Phase 4 — Catalog media upload + review server functions.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PermissionService } from "@/platform/permissions";
import {
  RequestUploadUrlSchema,
  RegisterMediaSchema,
  ReviewMediaSchema,
  ALLOWED_MIME,
  MAX_MEDIA_BYTES,
} from "../domain/schemas";
import { ValidationError } from "@/core/errors/AppError";

const BUCKET = "catalog-media";
const SIGNED_UPLOAD_TTL_SEC = 600;

async function productOrg(supabase: any, productId: string): Promise<string> {
  const { data, error } = await supabase
    .from("catalog_products" as never)
    .select("organization_id")
    .eq("id", productId)
    .single();
  if (error) throw error;
  return (data as { organization_id: string }).organization_id;
}

export const requestMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RequestUploadUrlSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ path: string; token: string; ttl: number }> => {
    if (!ALLOWED_MIME.includes(data.mime)) {
      throw new AppError("VALIDATION", "unsupported media type", `mime=${data.mime}`);
    }
    if (data.bytes > MAX_MEDIA_BYTES) {
      throw new AppError("VALIDATION", "file too large", `bytes=${data.bytes}`);
    }
    const orgId = await productOrg(context.supabase, data.productId);
    await PermissionService.require(context.userId, "catalog.media.upload", { orgId });

    const ext = data.mime.split("/")[1] ?? "bin";
    const path = `${data.productId}/${data.kind}/${crypto.randomUUID()}.${ext}`;

    const { data: signed, error } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, ttl: SIGNED_UPLOAD_TTL_SEC };
  });

export const registerUploadedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RegisterMediaSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    if (!ALLOWED_MIME.includes(data.mime)) {
      throw new AppError("VALIDATION", "unsupported media type", `mime=${data.mime}`);
    }
    if (data.bytes > MAX_MEDIA_BYTES) {
      throw new AppError("VALIDATION", "file too large", `bytes=${data.bytes}`);
    }
    const orgId = await productOrg(context.supabase, data.productId);
    await PermissionService.require(context.userId, "catalog.media.upload", { orgId });

    // Path must live under `<product_id>/...` per storage RLS.
    if (!data.storagePath.startsWith(`${data.productId}/`)) {
      throw new AppError("VALIDATION", "storage path outside product namespace");
    }

    const { data: row, error } = await context.supabase
      .from("catalog_product_media" as never)
      .insert({
        product_id: data.productId,
        storage_bucket: BUCKET,
        storage_path: data.storagePath,
        kind: data.kind,
        mime: data.mime,
        bytes: data.bytes,
        width: data.width ?? null,
        height: data.height ?? null,
        checksum: data.checksum ?? null,
        sort_order: data.sort_order,
        status: "pending",
        uploaded_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });

export const reviewMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReviewMediaSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: media, error: e0 } = await context.supabase
      .from("catalog_product_media" as never)
      .select("product_id")
      .eq("id", data.id)
      .single();
    if (e0) throw e0;
    const orgId = await productOrg(context.supabase, (media as { product_id: string }).product_id);
    await PermissionService.require(context.userId, "catalog.media.review", { orgId });

    const { error } = await context.supabase
      .from("catalog_product_media" as never)
      .update({
        status: data.decision,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        metadata: data.reason ? { review_reason: data.reason } : {},
      } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
