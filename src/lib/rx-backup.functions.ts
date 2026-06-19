// BLOCK-3: Server function that stores prescription image bytes into the
// database (`prescription_image_blobs`) so daily DB backups capture the
// binaries — not only the storage-bucket URLs.
//
// Called from the prescription page after each successful upload + commit.
// Uses service-role admin client (loaded inside the handler) because the
// caller is anonymous (no auth required to submit a prescription).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  rxId: z.string().min(3).max(64),
  storagePath: z.string().min(3).max(512),
  contentType: z.string().min(3).max(64),
  base64: z.string().min(8).max(16_000_000), // ~12 MB base64 ceiling
  sha256: z.string().length(64),
});

export const backupRxImage = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Decode base64 → bytes (server side).
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("image too large");

    // Idempotent on (rx_id, sha256) via UNIQUE constraint.
    const { error } = await supabaseAdmin.from("prescription_image_blobs" as never).insert({
      rx_id: data.rxId,
      storage_path: data.storagePath,
      content_bytes: bytes as never,
      content_type: data.contentType,
      byte_size: bytes.byteLength,
      sha256: data.sha256,
    } as never);
    if (error && !/duplicate key/i.test(error.message)) throw error;
    return { ok: true, bytes: bytes.byteLength };
  });
