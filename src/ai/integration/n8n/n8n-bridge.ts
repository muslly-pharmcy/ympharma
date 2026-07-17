import type {
  AIConnector,
  AIConnectorEvent,
  AIConnectorHealth,
} from "../core/connector-interface";

/**
 * N8NBridge — fires a webhook into n8n for downstream automation.
 * Configured via N8N_WEBHOOK_URL secret.
 */
export class N8NBridge implements AIConnector {
  name = "n8n";
  private url = process.env.N8N_WEBHOOK_URL ?? "";

  async connect(): Promise<boolean> {
    return Boolean(this.url);
  }

  async health(): Promise<AIConnectorHealth> {
    return {
      status: this.url ? "online" : "offline",
      metrics: { configured: Boolean(this.url) },
    };
  }

  async handle(event: AIConnectorEvent): Promise<void> {
    if (!this.url) return;
    try {
      await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch {
      // best-effort; failures don't block agent flow.
    }
  }

  async trigger(workflow: string, data: Record<string, unknown>) {
    if (!this.url) return { ok: false, error: "N8N_URL_MISSING" };
    const resp = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow, data }),
    });
    return { ok: resp.ok, status: resp.status };
  }
}
