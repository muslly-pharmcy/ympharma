// Thin server-function wrapper around runWhatsAppAgent so the browser can
// chat with the agent through an authenticated RPC instead of exposing the
// AI gateway key or a public endpoint.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  phone: z.string().min(6),
  incoming: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

export const chatWithWhatsAppAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "ai_not_configured",
        reply: "الخدمة غير مُهيّأة حالياً.",
        intent: null as string | null,
        escalated: false,
      };
    }
    const { runWhatsAppAgent } = await import("@/lib/whatsapp-ai-agent.server");
    const { randomUUID } = await import("crypto");
    const result = await runWhatsAppAgent({
      apiKey,
      conversationId: data.conversationId ?? randomUUID(),
      phone: data.phone,
      history: data.history ?? [],
      incoming: data.incoming,
    });
    return {
      ok: true as const,
      reply: result.reply,
      intent: result.intent,
      escalated: result.escalated,
      correlationId: result.correlationId,
    };
  });
