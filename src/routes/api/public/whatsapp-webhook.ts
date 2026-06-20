import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createHmac, timingSafeEqual } from "crypto";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * WhatsApp Cloud API inbound webhook.
 *
 * Setup in Meta:
 *  - Callback URL:  https://muslly.com/api/public/whatsapp-webhook
 *  - Verify token:  value of WHATSAPP_VERIFY_TOKEN env var
 *  - Subscribe to:  messages
 *
 * The bot:
 *  - Greets new conversations.
 *  - If user types "تأمين" / "insurance" → returns the insurance form link.
 *  - Otherwise replies via Lovable AI (Arabic customer service tone).
 */

const SUPPORT_SYSTEM = `أنت موظف خدمة عملاء صيدلية المصلي في عدن. أجب بإيجاز ودفء على رسائل العملاء عبر واتساب.
- ساعد في: التوصيل، الأسعار، توفر المنتجات، رفع الروشتة، التأمين الطبي، فروع المنصورة.
- إذا سأل عن التأمين الطبي وجّهه لرابط نموذج التأمين: https://muslly.com/insurance
- إذا سأل عن حالة طلب: اطلب رقم الطلب ثم وجّهه إلى https://muslly.com/track
- استخدم العربية. لا تذكر اسم الذكاء الاصطناعي.
- اختصر — أقل من 4 أسطر.
- للطوارئ الطبية وجّه للاتصال 191.`;

async function sendText(phoneId: string, token: string, to: string, body: string) {
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: body.slice(0, 4000) },
    }),
  }).catch(() => { /* swallow */ });
}

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      // Meta verification handshake
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && expected && token === expected) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        // Verify Meta HMAC signature when WHATSAPP_APP_SECRET is configured.
        // If unset (dev), allow through but log; if set, fail closed on mismatch.
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        const rawBody = await request.text();
        if (appSecret) {
          const sigHeader = request.headers.get("x-hub-signature-256") ?? "";
          const provided = sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : sigHeader;
          const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
          const a = Buffer.from(provided);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }
        // ACK quickly; do work after. Meta retries if we don't 200 fast.
        let payload: any = null;
        try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* ignore */ }

        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const apiToken = process.env.WHATSAPP_TOKEN;
        const aiKey = process.env.LOVABLE_API_KEY;

        if (!phoneId || !apiToken) return Response.json({ ok: true });

        try {
          const entry = payload?.entry?.[0]?.changes?.[0]?.value;
          const msg = entry?.messages?.[0];
          if (!msg) return Response.json({ ok: true });
          const from: string = msg.from;
          const textBody: string = (msg.text?.body ?? msg.button?.text ?? "").trim();
          if (!from) return Response.json({ ok: true });

          // Insurance keyword routing
          if (/تأمين|تامين|insurance|بطاقة\s*التأمين|المتخصصة/i.test(textBody)) {
            await sendText(phoneId, apiToken, from,
              `مرحباً بك في خدمة التأمين الطبي 🩺\nلرفع بياناتك (بطاقة التأمين + الوصفة + التشخيص) استخدم الرابط:\nhttps://muslly.com/insurance\nتأكد أن:\n• بطاقة التأمين سارية\n• الوصفة مختومة ومؤرّخة\n• التشخيص مكتوب بوضوح`);
            return Response.json({ ok: true });
          }

          if (/^\s*(مرحبا|مرحباً|السلام|hi|hello|بدء|start)/i.test(textBody)) {
            await sendText(phoneId, apiToken, from,
              `أهلاً بك في صيدلية المصلي 🌿\nكيف نخدمك؟\n• طلب دواء أو منتج\n• رفع روشتة طبية: https://muslly.com/prescription\n• خدمة التأمين الطبي: https://muslly.com/insurance\n• تتبع طلب: https://muslly.com/track`);
            return Response.json({ ok: true });
          }

          // Default: AI reply
          if (aiKey && textBody) {
            const gateway = createLovableAiGatewayProvider(aiKey);
            const { text } = await generateText({
              model: gateway("google/gemini-3-flash-preview"),
              system: SUPPORT_SYSTEM,
              messages: [{ role: "user", content: textBody }],
            });
            await sendText(phoneId, apiToken, from, text || "كيف يمكننا مساعدتك؟");
          } else if (textBody) {
            await sendText(phoneId, apiToken, from,
              "شكراً لتواصلك. سيرد أحد موظفينا قريباً. للاستعجال: +967 782 878 280");
          }
        } catch (e) {
          console.error("wa-webhook error", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
