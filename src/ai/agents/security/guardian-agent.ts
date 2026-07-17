import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class GuardianAgent extends BaseAgent {
  name = "guardian_agent";
  role = "security.guardian";
  capabilities = ["security.read", "audit.read"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as {
      severity?: string;
      source?: string;
      description?: string;
    };
    const sev = String(payload.severity ?? "info");
    return {
      type: "SECURITY_TRIAGE",
      result: {
        source: payload.source ?? null,
        severity: sev,
        block: sev === "critical",
      },
      confidence: 0.9,
    };
  }
}
