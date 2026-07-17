export const SECURITY_EVENTS = {
  LOGIN_FAILED: "LOGIN_FAILED",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  RLS_VIOLATION: "RLS_VIOLATION",
  SUSPICIOUS_QUERY: "SUSPICIOUS_QUERY",
  SECRET_EXPOSURE: "SECRET_EXPOSURE",
  SYSTEM_ANOMALY: "SYSTEM_ANOMALY",
} as const;

export type SecurityEventType =
  (typeof SECURITY_EVENTS)[keyof typeof SECURITY_EVENTS];

export type Severity = "low" | "medium" | "high" | "critical";
export type Action = "ALLOW" | "REVIEW" | "BLOCK";
