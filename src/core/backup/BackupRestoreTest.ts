// ============================================================
// BackupRestoreTest — اختبار integrity جاف (dry-run) لنسخة محددة
// ============================================================
// • لا يُجري استعادة فعلية (غير ممكن على Lovable Cloud).
// • يتحقّق أن الـ payload قابل للـ parse، يحتوي مجموعات متوقّعة،
//   ولا يحوي بنى مكسورة.

type SupabaseLike = {
  from: (table: string) => any;
};

export interface RestoreTestReport {
  backup_id: string;
  parsable: boolean;
  has_orders: boolean;
  has_prescriptions: boolean;
  schema_consistent: boolean;
  issues: string[];
}

export class BackupRestoreTest {
  constructor(private supabase: SupabaseLike) {}

  async testOne(backupId: string): Promise<RestoreTestReport> {
    const { data, error } = await this.supabase
      .from("backups")
      .select("id, payload")
      .eq("id", backupId)
      .maybeSingle();

    const issues: string[] = [];
    if (error || !data) {
      return {
        backup_id: backupId,
        parsable: false,
        has_orders: false,
        has_prescriptions: false,
        schema_consistent: false,
        issues: [error?.message ?? "backup_not_found"],
      };
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload =
        typeof data.payload === "string"
          ? (JSON.parse(data.payload) as Record<string, unknown>)
          : (data.payload as Record<string, unknown>);
    } catch (e) {
      issues.push(`payload_parse_error:${(e as Error).message}`);
    }

    const hasOrders = !!payload && Array.isArray(payload.orders);
    const hasRx =
      !!payload && (Array.isArray(payload.prescriptions) || Array.isArray(payload.rx));

    const consistent = !!payload && typeof payload === "object" && !Array.isArray(payload);
    if (!consistent) issues.push("payload_not_object");

    return {
      backup_id: backupId,
      parsable: !!payload && issues.length === 0,
      has_orders: hasOrders,
      has_prescriptions: hasRx,
      schema_consistent: consistent,
      issues,
    };
  }
}
