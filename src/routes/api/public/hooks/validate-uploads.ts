// Cron-driven audit: every 12h re-validates registered prescription files
// for content-type, size and magic-byte integrity. Violations are logged
// to operations_alerts_v14 and soft-deleted from the registry.

import { createFileRoute } from "@tanstack/react-router";
import { validateStorageObject } from "@/lib/upload-validation.functions";

export const Route = createFileRoute("/api/public/hooks/validate-uploads")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const since = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
        const { data: rows, error } = await supabaseAdmin
          .from("prescription_files" as never)
          .select("id, bucket, object_path, mime_type, size_bytes, created_at")
          .is("deleted_at", null)
          .gte("created_at", since)
          .limit(500);
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const list = (rows ?? []) as Array<{
          id: string; bucket: string; object_path: string;
          mime_type: string | null; size_bytes: number | null;
        }>;

        let checked = 0, rejected = 0;
        const failures: Array<{ id: string; code: string; message: string }> = [];

        for (const row of list) {
          checked++;
          const res = await validateStorageObject(row.bucket || "prescriptions", row.object_path);
          if (res.ok) continue;
          rejected++;
          failures.push({ id: row.id, code: res.code, message: res.message });

          // Soft-delete + remove object.
          await supabaseAdmin
            .from("prescription_files" as never)
            .update({ deleted_at: new Date().toISOString() } as never)
            .eq("id", row.id);
          try {
            await supabaseAdmin.storage.from(row.bucket || "prescriptions").remove([row.object_path]);
          } catch (e) {
            console.warn("[validate-uploads] remove failed", row.object_path, e);
          }

          await supabaseAdmin.from("operations_alerts_v14" as never).insert({
            alert_type: "upload_validation_failed",
            message: `[${res.code}] ${res.message} (file=${row.id}, path=${row.object_path})`,
            dedupe_key: `upload_validation:${row.id}:${res.code}`,
          } as never);
        }

        return Response.json({
          ok: true,
          checked,
          rejected,
          ran_at: new Date().toISOString(),
          failures: failures.slice(0, 25),
        });
      },
    },
  },
});
