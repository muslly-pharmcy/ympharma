// Backup verification server fns — verify on demand and list run history.
// All callers must be admin/owner; checks run via the user-scoped RLS client.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BackupVerificationService } from "@/core/backup/BackupVerificationService";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isOwner } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "owner" } as never);
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

export const verifyBackups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(50).default(10) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const service = new BackupVerificationService(context.supabase);
    const report = await service.verify(data.limit);

    // Persist manual run so it appears in the history alongside cron runs.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("backup_verification_runs" as never).insert({
        source: "manual",
        checked: report.checked,
        passed: report.passed,
        failed: report.failed,
        freshness_ok: report.freshness_ok,
        results: report.results as never,
      } as never);
    } catch {
      // history write failure must not break the verification response
    }

    return report;
  });

export const listBackupVerificationRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(100).default(30) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("backup_verification_runs" as never)
      .select("id, ran_at, source, checked, passed, failed, freshness_ok, correlation_id")
      .order("ran_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: (rows ?? []) as Array<{
      id: string; ran_at: string; source: string;
      checked: number; passed: number; failed: number;
      freshness_ok: boolean; correlation_id: string | null;
    }> };
  });

