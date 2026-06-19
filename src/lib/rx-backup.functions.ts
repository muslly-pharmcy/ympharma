// Server-side prescription image binary backup.
//
// C-2 SECURITY FIX: this used to be an unauthenticated server function that
// any anonymous caller could spam with up to 12 MB per call, writing
// attacker-controlled bytes into `prescription_image_blobs` via the service
// role. That endpoint is now gone.
//
// The replacement workflow:
//   1) Customer uploads images to the `prescriptions` storage bucket through
//      the existing anon-allowed storage policy (size/MIME/folder enforced).
//   2) `submit_prescription` RPC writes the row (URL-origin enforced).
//   3) `mirrorRxImagesFromStorage` (this file, admin-only) runs from the
//      admin dashboard OR a cron-driven internal endpoint. It uses the
//      service role to download missing files from the storage bucket and
//      write them to `prescription_image_blobs` for disaster-recovery
//      coverage inside the daily DB backup.
//
// The blob writer is ONLY reachable by an authenticated admin / owner.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  rxId: z.string().min(3).max(64).optional(),
});

export const mirrorRxImagesFromStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // Authorise: only owner or admin role.
    const { data: isOwner } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId, _role: "owner",
    } as never);
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId, _role: "admin",
    } as never);
    if (!isOwner && !isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data.limit ?? 50;

    // Find prescriptions whose images are not yet mirrored.
    let q = supabaseAdmin
      .from("prescriptions")
      .select("id, image_urls")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.rxId) q = q.eq("id", data.rxId);
    const { data: rxRows, error: rxErr } = await q;
    if (rxErr) throw rxErr;

    let mirrored = 0, skipped = 0, failed = 0;
    for (const row of rxRows ?? []) {
      const urls = (row.image_urls ?? []) as string[];
      for (const url of urls) {
        try {
          // Extract storage path: …/storage/v1/object/(sign|public)/prescriptions/<path>
          const m = url.match(/\/object\/(?:sign|public)\/prescriptions\/([^?]+)/);
          if (!m) { skipped++; continue; }
          const storagePath = decodeURIComponent(m[1]);

          // Skip if we already have any blob for this rx + storage_path.
          const { data: existing } = await supabaseAdmin
            .from("prescription_image_blobs" as never)
            .select("id")
            .eq("rx_id", row.id)
            .eq("storage_path", storagePath)
            .maybeSingle();
          if (existing) { skipped++; continue; }

          const { data: file, error: dlErr } = await supabaseAdmin.storage
            .from("prescriptions").download(storagePath);
          if (dlErr || !file) { failed++; continue; }
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (bytes.byteLength > 12 * 1024 * 1024) { skipped++; continue; }
          const digest = await crypto.subtle.digest("SHA-256", bytes);
          const sha256 = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0")).join("");

          const { error: insErr } = await supabaseAdmin
            .from("prescription_image_blobs" as never)
            .insert({
              rx_id: row.id,
              storage_path: storagePath,
              content_bytes: bytes as never,
              content_type: (file as Blob).type || "application/octet-stream",
              byte_size: bytes.byteLength,
              sha256,
            } as never);
          if (insErr && !/duplicate key/i.test(insErr.message)) { failed++; continue; }
          mirrored++;
        } catch { failed++; }
      }
    }
    return { ok: true, mirrored, skipped, failed, scanned: rxRows?.length ?? 0 };
  });
