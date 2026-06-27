// ============================================================
// BackupVerificationService — فحص integrity بنيوي لجدول backups
// ============================================================
// لا يمكن إجراء restore فعلي على Cloudflare Workers، فالخدمة تكتفي بـ:
//   • فحص بنية الـ payload (JSON صحيح، حجم معقول)
//   • تطابق orders_count / rx_count مع طول المصفوفات في الـ payload
//   • حداثة آخر نسخة يومية (≤ 36 ساعة)

type SupabaseLike = {
  from: (table: string) => any;
};

export interface BackupCheck {
  backup_id: string;
  kind: string;
  created_at: string;
  passed: boolean;
  issues: string[];
}

export interface BackupReport {
  ok: true;
  checked: number;
  passed: number;
  failed: number;
  freshness_ok: boolean;
  results: BackupCheck[];
}

const MIN_PAYLOAD_BYTES = 100;
const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;
const FRESHNESS_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export class BackupVerificationService {
  constructor(private supabase: SupabaseLike) {}

  async verify(limit = 10): Promise<BackupReport> {
    const { data: rows, error } = await this.supabase
      .from("backups")
      .select("id, kind, created_at, orders_count, rx_count, payload")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const results: BackupCheck[] = (rows ?? []).map((b: any) => this.checkOne(b));

    const latestDaily = (rows ?? []).find((r: any) => r.kind === "daily");
    const freshness_ok = latestDaily
      ? Date.now() - new Date(latestDaily.created_at).getTime() < FRESHNESS_MAX_AGE_MS
      : false;

    return {
      ok: true,
      checked: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      freshness_ok,
      results,
    };
  }

  private checkOne(b: {
    id: string;
    kind: string;
    created_at: string;
    orders_count: number;
    rx_count: number;
    payload: unknown;
  }): BackupCheck {
    const issues: string[] = [];
    const payload = b.payload;

    if (!payload || typeof payload !== "object") {
      issues.push("payload_missing_or_invalid");
    } else {
      const size = JSON.stringify(payload).length;
      if (size < MIN_PAYLOAD_BYTES) issues.push("payload_too_small");
      if (size > MAX_PAYLOAD_BYTES) issues.push("payload_too_large");

      const p = payload as Record<string, unknown>;
      const orders = p.orders;
      if (Array.isArray(orders) && orders.length !== b.orders_count) {
        issues.push(`orders_count_mismatch:${orders.length}vs${b.orders_count}`);
      }
      const rx = (p.prescriptions ?? p.rx) as unknown;
      if (Array.isArray(rx) && rx.length !== b.rx_count) {
        issues.push(`rx_count_mismatch:${rx.length}vs${b.rx_count}`);
      }
    }

    return {
      backup_id: b.id,
      kind: b.kind,
      created_at: b.created_at,
      passed: issues.length === 0,
      issues,
    };
  }
}
