// ============================================================
// RetentionPolicyEngine — تنفيذ سياسات الاحتفاظ + تنظيف idempotency
// ============================================================
// يستدعي دوال Postgres:
//   • apply_retention_policies()  — تحذف صفوف الجداول وفق retention_policies
//   • cleanup_idempotency_keys()  — يحذف مفاتيح idempotency منتهية الصلاحية

export interface RetentionSummary {
  retention_deleted: number;
  retention_error?: string;
  idempotency_deleted: number;
  idempotency_error?: string;
}

export class RetentionPolicyEngine {
  async run(): Promise<RetentionSummary> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const summary: RetentionSummary = {
      retention_deleted: 0,
      idempotency_deleted: 0,
    };

    try {
      const { data, error } = await supabaseAdmin.rpc("apply_retention_policies" as never);
      if (error) summary.retention_error = error.message;
      else summary.retention_deleted = typeof data === "number" ? data : 0;
    } catch (e) {
      summary.retention_error = (e as Error).message;
    }

    try {
      const { data, error } = await supabaseAdmin.rpc("cleanup_idempotency_keys" as never);
      if (error) summary.idempotency_error = error.message;
      else summary.idempotency_deleted = typeof data === "number" ? data : 0;
    } catch (e) {
      summary.idempotency_error = (e as Error).message;
    }

    return summary;
  }
}
