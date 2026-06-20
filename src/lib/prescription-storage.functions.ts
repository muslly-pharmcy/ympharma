// Phase 6A — Prescription Storage admin server functions.
// Read-only registry view + signed URL minting with per-audience TTLs.
//
// TTL policy (per CTO decision):
//   - whatsapp : 15 minutes  (sent in a message — short window)
//   - admin    : 24 hours    (pharmacist review session)
//   - preview  : 15 minutes  (any other short-lived inline preview)
//
// No customer-facing endpoint here — customers must request a fresh URL
// from a dedicated portal (Phase 6B).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  if (!isAdmin && !isOwner) throw new Error("forbidden");
}

const TTL: Record<"whatsapp" | "admin" | "preview", number> = {
  whatsapp: 15 * 60,
  admin: 24 * 60 * 60,
  preview: 15 * 60,
};

export type PrescriptionFileRow = {
  id: string;
  prescription_id: string;
  storage_provider: string;
  bucket: string;
  object_path: string;
  mime_type: string;
  size_bytes: number;
  sha256: string | null;
  legacy_blob_id: string | null;
  uploaded_via: string;
  created_at: string;
};

export const listPrescriptionFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        prescriptionId: z.string().trim().min(3).max(64).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }): Promise<{ rows: PrescriptionFileRow[]; total: number }> => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("prescription_files" as never)
      .select(
        "id, prescription_id, storage_provider, bucket, object_path, mime_type, size_bytes, sha256, legacy_blob_id, uploaded_via, created_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.prescriptionId) q = q.eq("prescription_id", data.prescriptionId);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as PrescriptionFileRow[], total: count ?? 0 };
  });

export const getPrescriptionFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        fileId: z.string().uuid(),
        audience: z.enum(["whatsapp", "admin", "preview"]).default("admin"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: file, error } = await context.supabase
      .from("prescription_files" as never)
      .select("id, bucket, object_path, prescription_id, mime_type")
      .eq("id", data.fileId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!file) throw new Error("not_found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ttl = TTL[data.audience];
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(file.bucket)
      .createSignedUrl(file.object_path, ttl);
    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message || "sign_failed");
    }

    // Audit: who minted what, for which audience.
    await context.supabase.from("activity_logs").insert({
      action: "prescription_file.url_minted",
      entity_type: "prescription_file",
      entity_id: file.id,
      details: {
        prescription_id: file.prescription_id,
        audience: data.audience,
        ttl_seconds: ttl,
      } as never,
    });

    return {
      url: signed.signedUrl,
      audience: data.audience,
      expires_in: ttl,
      expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      prescription_id: file.prescription_id,
      mime_type: file.mime_type,
    };
  });

export type PrescriptionStorageReport = {
  prescriptions_total: number;
  registry_files_total: number;
  legacy_blobs_total: number;
  prescriptions_with_registry: number;
  prescriptions_without_registry: number;
  registry_with_blob_link: number;
  storage_mode: string;
  generated_at: string;
};

export const getPrescriptionStorageReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PrescriptionStorageReport> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [rxTotal, regTotal, blobTotal, regWithLink, mode, rxWithReg] = await Promise.all([
      supabaseAdmin.from("prescriptions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("prescription_files" as never).select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabaseAdmin.from("prescription_image_blobs" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("prescription_files" as never).select("id", { count: "exact", head: true })
        .not("legacy_blob_id", "is", null).is("deleted_at", null),
      supabaseAdmin.from("app_settings").select("value").eq("key", "prescription_storage_mode").maybeSingle(),
      supabaseAdmin.from("prescription_files" as never).select("prescription_id").is("deleted_at", null).limit(10000),
    ]);

    const distinctRx = new Set<string>();
    for (const r of (rxWithReg.data as { prescription_id: string }[] | null) ?? []) {
      distinctRx.add(r.prescription_id);
    }
    const prescriptionsTotal = rxTotal.count ?? 0;

    return {
      prescriptions_total: prescriptionsTotal,
      registry_files_total: regTotal.count ?? 0,
      legacy_blobs_total: blobTotal.count ?? 0,
      prescriptions_with_registry: distinctRx.size,
      prescriptions_without_registry: Math.max(0, prescriptionsTotal - distinctRx.size),
      registry_with_blob_link: regWithLink.count ?? 0,
      storage_mode: (mode.data?.value as string | null) ?? "dual_write",
      generated_at: new Date().toISOString(),
    };
  });

export const setPrescriptionStorageMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ mode: z.enum(["legacy_only", "dual_write", "storage_only"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: "prescription_storage_mode",
        value: data.mode as never,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_logs").insert({
      action: "prescription.storage_mode_changed",
      entity_type: "app_settings",
      details: { mode: data.mode } as never,
    });
    return { ok: true, mode: data.mode };
  });
