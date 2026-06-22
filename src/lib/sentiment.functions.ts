// Arabic sentiment analysis via Lovable AI Gateway (Gemini Flash).
// Replaces the keyword-dictionary approach with real NLU — handles dialects,
// negation, sarcasm, and mixed reviews far better than word lists.
//
// Returns a normalized score in [-1, 1] plus a label and one-line rationale.

import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({
  text: z.string().min(1).max(2000),
});

const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  score: z.number().min(-1).max(1),
  rationale: z.string().max(160),
});

export type SentimentResult = z.infer<typeof SentimentSchema>;

export const analyzeSentiment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; result: SentimentResult } | { ok: false; error: string }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, error: "ai_not_configured" };

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system:
          "You are an Arabic-aware sentiment classifier for pharmacy product reviews. " +
          "Handle Yemeni/Gulf dialect, negation, and mixed sentiment. " +
          "Score: -1 very negative, 0 neutral, +1 very positive. Rationale in Arabic, one short line.",
        prompt: `قيّم مشاعر هذه المراجعة:\n${data.text}`,
        experimental_output: Output.object({ schema: SentimentSchema }),
      });
      return { ok: true, result: experimental_output };
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429")) return { ok: false, error: "rate_limited" };
      if (msg.includes("402")) return { ok: false, error: "credits_exhausted" };
      return { ok: false, error: msg.slice(0, 200) };
    }
  });
