/**
 * RLSMonitor — scans queries or SQL strings for dangerous keywords that
 * imply RLS bypass or admin override attempts.
 */
const DANGEROUS = [
  "service_role",
  "bypass_rls",
  "row_security = off",
  "set role postgres",
  "security definer",
  "drop policy",
];

export class RLSMonitor {
  check(query: unknown): { safe: boolean; risk: "low" | "high"; flagged: string[] } {
    const s = typeof query === "string" ? query : JSON.stringify(query ?? {});
    const flagged = DANGEROUS.filter((k) => s.toLowerCase().includes(k));
    return {
      safe: flagged.length === 0,
      risk: flagged.length ? "high" : "low",
      flagged,
    };
  }
}
