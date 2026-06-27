// ============================================================
// PIIRedactor — إخفاء بيانات شخصية حساسة من نصوص الـ prompts
// ============================================================
// أنماط محدّدة بدلاً من حجب كل شيء — يبقى السياق الطبي مسموحًا.

const REDACT = "[REDACTED]";

export interface PiiPattern {
  name: string;
  rx: RegExp;
}

export const DEFAULT_PII_PATTERNS: PiiPattern[] = [
  { name: "national_id", rx: /\b[12]\d{9}\b/ }, // الرقم الوطني السعودي
  { name: "credit_card", rx: /\b(?:\d[ -]?){13,16}\b/ },
  { name: "iban", rx: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/ },
  { name: "email", rx: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/ },
];

export interface PiiResult {
  redacted: string;
  hits: string[];
}

export class PIIRedactor {
  constructor(private patterns: PiiPattern[] = DEFAULT_PII_PATTERNS) {}

  redact(input: string): PiiResult {
    let out = input;
    const hits: string[] = [];
    for (const { name, rx } of this.patterns) {
      if (rx.test(out)) {
        hits.push(`pii:${name}`);
        out = out.replace(new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g"), REDACT);
      }
    }
    return { redacted: out, hits };
  }
}
