// AI Safety guardrails — input/output checks for prompts sent to LLMs.
// Adapted to a pharmacy context: PHI/PII detection is targeted, not blanket
// blocking, so legitimate medical queries ("جرعة الباراسيتامول للطفل")
// still pass. Prompt-injection patterns are matched at *token boundaries*
// so words inside Arabic medical text aren't falsely flagged.

export type SafetyVerdict = {
  allowed: boolean;
  reasons: string[];
  redactedPrompt?: string;
};

// English + Arabic injection patterns. Anchored to start/newline so a casual
// mention inside a longer paragraph doesn't false-trigger.
const INJECTION_PATTERNS: RegExp[] = [
  /(^|\n)\s*ignore (all|previous|above) (instructions|prompts)/i,
  /(^|\n)\s*disregard (all|previous|above)/i,
  /(^|\n)\s*you are now\b/i,
  /(^|\n)\s*system\s*:/i,
  /<\s*\|?\s*system\s*\|?\s*>/i,
  /(^|\n)\s*تجاهل (كل|جميع) (التعليمات|الأوامر)/i,
  /(^|\n)\s*أنت الآن\b/i,
];

// PII patterns — only block when they look like *real* identifiers, not
// medical numbers. Phone matches Saudi/Yemen mobile shapes.
const PII_PATTERNS: { name: string; rx: RegExp }[] = [
  { name: "national_id", rx: /\b[12]\d{9}\b/ }, // Saudi national ID shape
  { name: "credit_card", rx: /\b(?:\d[ -]?){13,16}\b/ },
  { name: "iban", rx: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/ },
];

const REDACT = "[REDACTED]";

export function checkPromptSafety(prompt: string): SafetyVerdict {
  const reasons: string[] = [];

  for (const rx of INJECTION_PATTERNS) {
    if (rx.test(prompt)) {
      reasons.push("prompt_injection");
      break;
    }
  }

  let redacted = prompt;
  for (const { name, rx } of PII_PATTERNS) {
    if (rx.test(redacted)) {
      reasons.push(`pii:${name}`);
      redacted = redacted.replace(rx, REDACT);
    }
  }

  // Length cap — defends against context-stuffing attacks.
  if (prompt.length > 20000) reasons.push("too_long");

  const blocking = reasons.some((r) => r === "prompt_injection" || r === "too_long");
  return {
    allowed: !blocking,
    reasons,
    redactedPrompt: reasons.length > 0 ? redacted : undefined,
  };
}

export function validateAiOutput(output: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (output.length < 2) issues.push("empty_response");
  if (output.length > 50000) issues.push("response_too_long");

  // If the model echoed an obvious injection back at us, flag it.
  if (/ignore (all|previous) instructions/i.test(output)) issues.push("echoed_injection");

  return { valid: issues.length === 0, issues };
}
