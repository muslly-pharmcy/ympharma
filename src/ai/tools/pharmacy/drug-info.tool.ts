import type { AITool, AIToolContext, AIToolResult } from "../core/tool-interface";

/**
 * DrugInfoTool — Gemini-backed short drug summary via Lovable AI Gateway.
 * Best-effort; falls back to empty text on gateway failure.
 */
export class DrugInfoTool implements AITool {
  name = "drug_info";
  description = "Return a concise drug information brief (Arabic).";
  permissions = ["drug.info.read"];

  async execute(input: unknown, _ctx: AIToolContext): Promise<AIToolResult> {
    const drug = String((input as { drug?: string })?.drug ?? "").trim();
    if (!drug) return { ok: false, error: "DRUG_REQUIRED" };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: true, data: { drug, summary: "" } };
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a clinical pharmacist. Reply in Arabic, ≤ 6 lines." },
            { role: "user", content: `اعطني ملخصا سريعا عن دواء: ${drug}` },
          ],
        }),
      });
      if (!resp.ok) return { ok: false, error: `gateway ${resp.status}` };
      const j = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = j.choices?.[0]?.message?.content ?? "";
      return { ok: true, data: { drug, summary: text } };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
