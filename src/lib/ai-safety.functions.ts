// Thin server fn wrapping the existing AISafetyGuard so admin UI can
// pre-check user inputs before sending to the AI Copilot.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkPromptSafety, validateAiOutput } from "@/core/ai-safety/AISafetyGuard";

export const checkAISafety = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().max(10000),
        mode: z.enum(["prompt", "output"]).default("prompt"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.mode === "output") {
      const v = validateAiOutput(data.text);
      return { mode: "output" as const, valid: v.valid, issues: v.issues };
    }
    const verdict = checkPromptSafety(data.text);
    return {
      mode: "prompt" as const,
      allowed: verdict.allowed,
      reasons: verdict.reasons,
      sanitized: verdict.redactedPrompt ?? data.text,
    };
  });
