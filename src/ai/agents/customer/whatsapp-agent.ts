import { BaseAgent } from "../base-agent";
import type { AIEvent } from "../../core/types";

export class WhatsappAgent extends BaseAgent {
  name = "customer_agent";
  role = "customer.whatsapp";
  capabilities = ["customer.message", "whatsapp.read"];

  async execute(event: AIEvent): Promise<unknown> {
    const payload = (event.payload ?? {}) as { message?: string; from?: string };
    const text = String(payload.message ?? "").toLowerCase();
    let intent = "general";
    if (/order|طلب|اطلب/.test(text)) intent = "order";
    else if (/price|سعر/.test(text)) intent = "pricing";
    else if (/help|مساعدة|خدمة/.test(text)) intent = "support";
    return {
      type: "WHATSAPP_INTENT",
      result: {
        from: payload.from ?? null,
        intent,
        suggested_reply: "تم استلام رسالتك، سيتم الرد قريباً.",
      },
      confidence: 0.75,
    };
  }
}
