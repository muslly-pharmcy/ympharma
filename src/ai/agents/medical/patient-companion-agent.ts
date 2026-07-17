import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

/**
 * PatientCompanionAgent — Phase 11.
 * Consumes patient events (MEDICATION_STARTED, VAULT_FILE_UPLOADED,
 * PATIENT_TIMELINE_UPDATED) and produces read-only recommendations.
 *
 * For v1 it returns deterministic recommendations. Wiring Lovable AI Gateway
 * for personalized suggestions is a follow-up (needs patient timeline
 * context in the payload; keeping this pure so the agent is safe to fire
 * on any event without extra DB calls).
 */
export class PatientCompanionAgent extends BaseAgent {
  name = "patient_companion_agent";
  role = "patient.personal_health_assistant";
  capabilities = [
    "patient.timeline.analyze",
    "medication.adherence.suggest",
    "vault.summarize",
  ];

  async execute(event: AIEvent): Promise<unknown> {
    this.log("processing patient event", { type: event.event_type });

    const payload = (event.payload ?? {}) as Record<string, unknown>;

    switch (event.event_type) {
      case "PATIENT_MEDICATION_STARTED": {
        const med = String(payload.medicine_name ?? "الدواء");
        return this.recommend([
          `تذكير: ابدأ تناول ${med} في الموعد المحدد.`,
          "احتفظ بسجل الجرعات لضمان الالتزام.",
          "أخبرنا فورًا إذا شعرت بأي أعراض جانبية.",
        ]);
      }
      case "PATIENT_VAULT_UPLOADED": {
        const title = String(payload.title ?? "الملف");
        return this.recommend([
          `تم أرشفة "${title}" بأمان في خزنتك الطبية.`,
          "يمكنك مشاركته مع طبيبك عبر منح صلاحية مؤقتة.",
        ]);
      }
      default:
        return this.recommend(["تمت مراجعة الحدث الصحي بواسطة المساعد."]);
    }
  }

  private recommend(recommendations: string[]) {
    return {
      type: "PATIENT_HEALTH_RECOMMENDATION",
      result: { recommendations },
      confidence: 0.9,
    };
  }
}
