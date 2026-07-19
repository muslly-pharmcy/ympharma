// WhatsApp agent hook — every dispatch now writes an agent_runs row and a
// matching agent_actions ledger entry (Batch 6 / H2). Previously the run was
// invisible to the automation hub.

import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";
import { askAssistant } from "@/lib/ai-assistant.functions";

const DEFAULT_BRIEF = `حلّل قائمة الإرسال الصادرة الآن:
- 11 طلبًا نشطًا، 3 عمليات تتبّع
- صُغ رسائل ORDER_CONFIRMED / STATUS_CHANGED / CHRONIC_REFILL_REMINDER / CART_RECOVERY
- شخصنة باسم العميل والسياق، تجنّب التكرار التسويقي
أعد مصفوفة JSON صارمة فقط.`;

async function run(request: Request): Promise<Response> {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const startedAt = new Date().toISOString();
  const started = Date.now();

  // 1) Open an agent_runs row up-front so even a hard failure is auditable.
  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("agent_runs")
    .insert({ agent: "whatsapp", kind: "scheduled", status: "running", started_at: startedAt } as never)
    .select("id")
    .single();
  if (runErr || !runRow) {
    return new Response(JSON.stringify({ ok: false, agent: "whatsapp", error: runErr?.message ?? "insert failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  const runId = (runRow as { id: string }).id;

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

  const finish = async (fields: Record<string, unknown>) => {
    await supabaseAdmin
      .from("agent_runs")
      .update({ ...fields, finished_at: new Date().toISOString(), execution_time_ms: Date.now() - started } as never)
      .eq("id", runId);
  };

  try {
    const res = await askAssistant({
      data: { mode: "whatsapp", messages: [{ role: "user", content: brief }] },
    });
    const text = (res.reply ?? "").trim();
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let recommendations: unknown[] = [];
    let parseError: string | null = null;
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) recommendations = parsed;
      else parseError = "model returned non-array JSON";
    } catch {
      parseError = "invalid JSON from model";
    }

    if (parseError) {
      await finish({ status: "error", summary: parseError, findings_count: 0, recommendations_count: 0 });
      await supabaseAdmin.from("agent_actions").insert({
        agent_name: "whatsapp", originating_agent: "whatsapp" as never,
        target_pipeline: "MARKETING_QUEUE" as never, priority_level: "HIGH",
        action_type: "WHATSAPP_FAILURE",
        payload: { run_id: runId, source: "hook", raw: text } as never,
        status: "failed", execution_status: "FAILED" as never,
        compiled_arabic_output: `فشل وكيل WhatsApp: ${parseError}`,
        error_message: parseError,
      } as never).then(() => null, () => null);
      return new Response(
        JSON.stringify({ ok: false, agent: "whatsapp", run_id: runId, error: parseError, raw: text }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const recs = recommendations.length;
    const summary = `whatsapp dispatch: ${recs} رسالة`;
    await finish({ status: "ok", summary, details: { recommendations } as never, findings_count: recs, recommendations_count: recs });

    // Ledger: real recs → PENDING_APPROVAL, none → NO_OP (M11).
    const isNoop = recs === 0;
    await supabaseAdmin.from("agent_actions").insert({
      agent_name: "whatsapp", originating_agent: "whatsapp" as never,
      target_pipeline: "MARKETING_QUEUE" as never,
      priority_level: isNoop ? "LOW" : "MEDIUM",
      action_type: isNoop ? "WHATSAPP_NO_OP" : "WHATSAPP_RECOMMENDATION",
      payload: { run_id: runId, recommendations: recs, source: "hook", details: { recommendations } } as never,
      status: isNoop ? "noop" : "pending",
      execution_status: (isNoop ? "NO_OP" : "PENDING_APPROVAL") as never,
      compiled_arabic_output: isNoop ? "لا رسائل WhatsApp مرشّحة في هذه الدورة" : summary,
    } as never).then(() => null, () => null);

    return new Response(
      JSON.stringify({ ok: true, agent: "whatsapp", run_id: runId, recommendations, count: recs }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish({ status: "error", summary: msg });
    await supabaseAdmin.from("agent_actions").insert({
      agent_name: "whatsapp", originating_agent: "whatsapp" as never,
      target_pipeline: "MARKETING_QUEUE" as never, priority_level: "HIGH",
      action_type: "WHATSAPP_FAILURE",
      payload: { run_id: runId, source: "hook" } as never,
      status: "failed", execution_status: "FAILED" as never,
      compiled_arabic_output: `فشل وكيل WhatsApp: ${msg}`,
      error_message: msg,
    } as never).then(() => null, () => null);
    return new Response(JSON.stringify({ ok: false, agent: "whatsapp", run_id: runId, error: msg }), {
      status: 500, headers: { "Content-Type": "application/json" },
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
