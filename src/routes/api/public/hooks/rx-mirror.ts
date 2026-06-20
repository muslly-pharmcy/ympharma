// Cron endpoint: mirror prescription images from storage into
// `prescription_image_blobs` so the daily DB backup contains the binaries.
//
// Why a public hook: the same blob-mirror logic exists as an admin-only server
// function (`mirrorRxImagesFromStorage`), but nothing was triggering it, so the
// table stayed empty. This endpoint runs the identical logic on a schedule via
// pg_cron + `verifyCronSecret`. Service role is loaded inside the handler.

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/rx-mirror")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        try {
          const body = await request.json().catch(() => ({} as { limit?: number; rxId?: string }));
          const limit = typeof body?.limit === "number" ? Math.min(200, Math.max(1, body.limit)) : 50;
          const rxId = typeof body?.rxId === "string" ? body.rxId : undefined;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          let q = supabaseAdmin
            .from("prescriptions")
            .select("id, image_urls")
            .order("created_at", { ascending: false })
            .limit(limit);
          if (rxId) q = q.eq("id", rxId);
          const { data: rxRows, error: rxErr } = await q;
          if (rxErr) {
            return new Response(JSON.stringify({ ok: false, error: rxErr.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          let mirrored = 0, skipped = 0, failed = 0;
          for (const row of rxRows ?? []) {
            const urls = (row.image_urls ?? []) as string[];
            for (const url of urls) {
              try {
                const m = url.match(/\/object\/(?:sign|public)\/prescriptions\/([^?]+)/);
                if (!m) { skipped++; continue; }
                const storagePath = decodeURIComponent(m[1]);

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

          return new Response(
            JSON.stringify({ ok: true, scanned: rxRows?.length ?? 0, mirrored, skipped, failed }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, hint: "POST with x-cron-secret to mirror prescription images into the blob table." }),
          { headers: { "Content-Type": "application/json" } },
        ),
    },
  },
});
