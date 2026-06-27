// ============================================================
// AISafetyGuard — facade يجمع InjectionDetector و PIIRedactor
// ============================================================
// يحافظ على نفس مخرجات الـ API القديم (checkPromptSafety / validateAiOutput)
// حتى لا تنكسر أي مستهلكات قائمة أو لاحقة.

import { InjectionDetector } from "./InjectionDetector";
import { PIIRedactor } from "./PIIRedactor";

export interface SafetyVerdict {
  allowed: boolean;
  reasons: string[];
  redactedPrompt?: string;
}

export interface OutputValidation {
  valid: boolean;
  issues: string[];
}

const MAX_PROMPT_LENGTH = 20_000;
const MAX_OUTPUT_LENGTH = 50_000;

export class AISafetyGuard {
  private injection = new InjectionDetector();
  private pii = new PIIRedactor();

  checkPrompt(prompt: string): SafetyVerdict {
    const reasons: string[] = [];

    if (this.injection.detect(prompt)) reasons.push("prompt_injection");

    const { redacted, hits } = this.pii.redact(prompt);
    reasons.push(...hits);

    if (prompt.length > MAX_PROMPT_LENGTH) reasons.push("too_long");

    const blocking = reasons.some((r) => r === "prompt_injection" || r === "too_long");
    return {
      allowed: !blocking,
      reasons,
      redactedPrompt: reasons.length > 0 ? redacted : undefined,
    };
  }

  validateOutput(output: string): OutputValidation {
    const issues: string[] = [];
    if (output.length < 2) issues.push("empty_response");
    if (output.length > MAX_OUTPUT_LENGTH) issues.push("response_too_long");
    if (/ignore (all|previous) instructions/i.test(output)) issues.push("echoed_injection");
    return { valid: issues.length === 0, issues };
  }
}

const defaultGuard = new AISafetyGuard();

// Legacy named-export facade (compatible with src/lib/ai-safety.ts).
export function checkPromptSafety(prompt: string): SafetyVerdict {
  return defaultGuard.checkPrompt(prompt);
}

export function validateAiOutput(output: string): OutputValidation {
  return defaultGuard.validateOutput(output);
}
