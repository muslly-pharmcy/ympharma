// ============================================================
// RetentionScheduler — facade للـ retention-sweep hook
// ============================================================
// طبقة رفيعة تبسّط الاستدعاء من /api/public/hooks/retention-sweep
// بدون أن يعرف الـ hook عن أي تفاصيل تنفيذ.

import { RetentionPolicyEngine, type RetentionSummary } from "./RetentionPolicyEngine";

export class RetentionScheduler {
  private engine = new RetentionPolicyEngine();

  async sweep(): Promise<RetentionSummary> {
    return this.engine.run();
  }
}
