// Backup integrity verification — pragmatic checks against the `backups` table.
// We can't spin up a temp database on Cloudflare Workers, so "restore test"
// becomes "structural + freshness + spot-check" against the JSONB payload.
//
// Checks performed:
//   1. Payload is a non-empty JSON object.
//   2. orders_count and rx_count match the array lengths inside payload (if present).
//   3. At least one daily backup exists within the last 36 hours.
//   4. Payload size is within reasonable bounds (>100 bytes, <50MB).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type BackupCheck = {
  backup_id: string;
  kind: string;
  created_at: string;
  passed: boolean;
  issues: string[];
};

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

    const { data: rows, error } = await context.supabase
      .from("backups")
      .select("id, kind, created_at, orders_count, rx_count, payload")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const results: BackupCheck[] = [];
    for (const b of rows ?? []) {
      const issues: string[] = [];
      const payload = b.payload;

      if (!payload || typeof payload !== "object") {
        issues.push("payload_missing_or_invalid");
      } else {
        const size = JSON.stringify(payload).length;
        if (size < 100) issues.push("payload_too_small");
        if (size > 50 * 1024 * 1024) issues.push("payload_too_large");

        const orders = (payload as any).orders;
        if (Array.isArray(orders) && orders.length !== b.orders_count) {
          issues.push(`orders_count_mismatch:${orders.length}vs${b.orders_count}`);
        }
        const rx = (payload as any).prescriptions ?? (payload as any).rx;
        if (Array.isArray(rx) && rx.length !== b.rx_count) {
          issues.push(`rx_count_mismatch:${rx.length}vs${b.rx_count}`);
        }
      }

      results.push({
        backup_id: b.id,
        kind: b.kind,
        created_at: b.created_at,
        passed: issues.length === 0,
        issues,
      });
    }

    // Freshness — daily backup within last 36h.
    const latestDaily = (rows ?? []).find((r: any) => r.kind === "daily");
    const freshness_ok = latestDaily
      ? Date.now() - new Date(latestDaily.created_at).getTime() < 36 * 60 * 60 * 1000
      : false;

    return {
      ok: true as const,
      checked: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      freshness_ok,
      results,
    };
  });
