// Facebook Messenger / Page outbound connector via Graph API.
import { BaseChannelConnector, type SendMessageOptions, type SendResult } from "./base-connector";

export class FacebookConnector extends BaseChannelConnector {
  constructor(private pageAccessToken: string, private pageId: string) {
    super();
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    try {
      if (!this.validateHandle(options.to)) {
        return { success: false, error: "معرف فيسبوك غير صالح" };
      }
      const url = `https://graph.facebook.com/v18.0/${this.pageId}/messages?access_token=${this.pageAccessToken}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: options.to },
          message: { text: options.message },
          ...(options.metadata ?? {}),
        }),
      });
      const data = (await res.json()) as { error?: { message: string }; message_id?: string };
      if (data.error) return { success: false, error: data.error.message };
      return { success: true, externalId: data.message_id };
    } catch (error) {
      this.log("Facebook", "Send failed", { error, to: options.to });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  validateHandle(handle: string): boolean {
    return /^\d+$/.test(handle);
  }

  getPlatformName(): string {
    return "Facebook";
  }
}
