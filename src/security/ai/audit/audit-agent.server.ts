/**
 * AuditAgent — server-only writer for the ai_security_audit trail.
 * Filename is .server.ts to enforce the client-graph boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export class AuditAgent {
  name = "audit_guardian";
  constructor(private supabase: Admin) {}

  async record(data: {
    actor?: string;
    actor_id?: string | null;
    action: string;
    resource?: string;
    result?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.supabase.from("ai_security_audit").insert({
      actor: data.actor ?? null,
      actor_id: data.actor_id ?? null,
      action: data.action,
      resource: data.resource ?? null,
      result: data.result ?? null,
      metadata: data.metadata ?? {},
    });
  }
}
