// ============================================================
// InjectionDetector — كشف محاولات prompt injection
// ============================================================
// أنماط مقيّدة بـ بداية السطر/سطر جديد حتى لا تتعارض مع نصوص طبية.

export const DEFAULT_INJECTION_PATTERNS: RegExp[] = [
  /(^|\n)\s*ignore (all|previous|above) (instructions|prompts)/i,
  /(^|\n)\s*disregard (all|previous|above)/i,
  /(^|\n)\s*you are now\b/i,
  /(^|\n)\s*system\s*:/i,
  /<\s*\|?\s*system\s*\|?\s*>/i,
  /(^|\n)\s*تجاهل (كل|جميع) (التعليمات|الأوامر)/i,
  /(^|\n)\s*أنت الآن\b/i,
];

export class InjectionDetector {
  constructor(private patterns: RegExp[] = DEFAULT_INJECTION_PATTERNS) {}

  detect(input: string): boolean {
    for (const rx of this.patterns) {
      if (rx.test(input)) return true;
    }
    return false;
  }
}
