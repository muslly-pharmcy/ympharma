/**
 * SecretGuardian — regex scan for API-key / service-role patterns in text.
 */
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "openai_sk", re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "supabase_service_role", re: /service_role/i },
  { name: "sb_secret", re: /sb_secret_[a-zA-Z0-9]+/ },
  { name: "generic_apikey", re: /api[_-]?key\s*[:=]\s*["'][^"']{16,}["']/i },
  { name: "aws_access_key", re: /AKIA[0-9A-Z]{16}/ },
];

export class SecretGuardian {
  scan(text: string): { found: boolean; matches: string[] } {
    const matches: string[] = [];
    for (const { name, re } of PATTERNS) {
      if (re.test(text)) matches.push(name);
    }
    return { found: matches.length > 0, matches };
  }
}
