import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";
import { askAssistant } from "@/lib/ai-assistant.functions";

const DEFAULT_BRIEF = `حلّل قائمة الإرسال الصادرة الآن:
- 11 طلبًا نشطًا، 3 عمليات تتبّع
- صُغ رسائل ORDER_CONFIRMED / STATUS_CHANGED / CHRONIC_REFILL_REMINDER / CART_RECOVERY
- شخصنة باسم العميل والسياق، تجنّب التكرار التسويقي
أعد مصفوفة JSON صارمة فقط.`;

async function run(request: Request): Promise<Response> {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  let brief = DEFAULT_BRIEF;
  if (request.method === "POST") {
    try {
      const ct = request.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const body = (await request.json()) as { brief?: string } | null;
        if (body?.brief && typeof body.brief === "string") brief = body.brief;
      }
    } catch {
      // ignore body parse errors, use default brief
    }
  }

  try {
    const res = await askAssistant({
      data: { mode: "whatsapp", messages: [{ role: "user", content: brief }] },
    });
    const text = (res.reply ?? "").trim();
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let recommendations: unknown[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) recommendations = parsed;
    } catch {
      return new Response(
        JSON.stringify({ ok: false, agent: "whatsapp", error: "invalid JSON from model", raw: text }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ ok: true, agent: "whatsapp", recommendations, count: recommendations.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, agent: "whatsapp", error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/hooks/agents/whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, agent: "whatsapp", hint: "POST with x-cron-secret header" }),
          { headers: { "Content-Type": "application/json" } },
        ),
    },
  },
});
