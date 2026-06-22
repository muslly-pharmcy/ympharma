// X (Twitter) Direct Message outbound connector.
import { BaseChannelConnector, type SendMessageOptions, type SendResult } from "./base-connector";

export class XConnector extends BaseChannelConnector {
  constructor(private bearerToken: string) {
    super();
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    try {
      const url = `https://api.twitter.com/2/dm_conversations/with/${encodeURIComponent(options.to)}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: options.message, ...(options.metadata ?? {}) }),
      });
      const data = (await res.json()) as { title?: string; data?: { id?: string } };
      if (!res.ok) return { success: false, error: data.title ?? "فشل الإرسال" };
      return { success: true, externalId: data.data?.id };
    } catch (error) {
      this.log("X", "Send failed", { error, to: options.to });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  validateHandle(handle: string): boolean {
    return /^\d+$/.test(handle);
  }

  getPlatformName(): string {
    return "X (Twitter)";
  }
}
