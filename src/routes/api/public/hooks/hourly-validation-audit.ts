// Hourly validation audit — re-runs upload validation on the last hour's
// prescription_files and logs any rejections to operations_alerts_v14.
// Does NOT delete data; that responsibility stays with the dedicated
// validate-uploads-12h job. Auth: x-cron-secret.
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";
import { hourlyCronExpired, expiredResponse } from "@/lib/hourly-guard";

export const Route = createFileRoute("/api/public/hooks/hourly-validation-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;
        if (hourlyCronExpired()) return expiredResponse();

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { validateUploadBytes } = await import("@/lib/upload-validation.functions");

          const sinceIso = new Date(Date.now() - 60 * 60_000).toISOString();
          const { data: files, error } = await supabaseAdmin
            .from("prescription_files")
            .select("id,storage_path,mime_type,file_size,deleted_at")
            .gte("created_at", sinceIso)
            .is("deleted_at", null)
            .limit(200);

          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          let scanned = 0;
          let violations = 0;
          for (const f of files ?? []) {
            scanned += 1;
            try {
              const { data: blob } = await supabaseAdmin.storage
                .from("prescriptions")
                .download(f.storage_path as string);
              if (!blob) continue;
              const buf = new Uint8Array(await blob.arrayBuffer());
              const verdict = validateUploadBytes(buf, {
                declaredMime: f.mime_type as string | null,
                declaredSize: f.file_size as number | null,
                filename: f.storage_path as string,
              });
              if (!verdict.ok) {
                violations += 1;
                await supabaseAdmin.from("operations_alerts_v14").insert({
                  alert_type: "upload_violation",
                  message: `Prescription ${f.id} failed audit: ${verdict.reason}`,
                  dedupe_key: `upload-violation:${f.id}`,
                });
              }
            } catch (e) {
              console.warn("[hourly-validation-audit]", f.id, (e as Error).message);
            }
          }

          return Response.json({ ok: true, scanned, violations });
        } catch (e) {
          console.error("[cron hourly-validation-audit]", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
