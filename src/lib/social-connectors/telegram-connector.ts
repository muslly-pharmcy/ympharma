// Telegram Bot API outbound connector.
import { BaseChannelConnector, type SendMessageOptions, type SendResult } from "./base-connector";

export class TelegramConnector extends BaseChannelConnector {
  constructor(private botToken: string) {
    super();
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    try {
      if (!this.validateHandle(options.to)) {
        return { success: false, error: "معرف تيليجرام غير صالح" };
      }
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: options.to,
          text: options.message,
          parse_mode: "HTML",
          ...(options.metadata ?? {}),
        }),
      });
      const data = (await res.json()) as { ok: boolean; description?: string; result?: { message_id: number } };
      if (!data.ok) return { success: false, error: data.description ?? "فشل الإرسال" };
      return { success: true, externalId: String(data.result?.message_id ?? "") };
    } catch (error) {
      this.log("Telegram", "Send failed", { error, to: options.to });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  validateHandle(handle: string): boolean {
    return /^(-?\d+|[a-zA-Z0-9_]{5,32})$/.test(handle);
  }

  getPlatformName(): string {
    return "Telegram";
  }
}
