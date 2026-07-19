import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireCronAuth as verifyCronSecret } from "@/middleware/cron-auth";

export const Route = createFileRoute("/api/public/hooks/weekly-ai-enrich")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronSecret(request);
        if (denied) return denied;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return jsonResp({ ok: false, error: "LOVABLE_API_KEY missing" }, 500);

        let limit = 30;
        try {
          const body = (await request.json().catch(() => ({}))) as { limit?: number };
          if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 100) limit = body.limit;
        } catch {}

        const started = Date.now();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: customers, error } = await supabaseAdmin.rpc("customers_for_enrichment", { _limit: limit });
        if (error) return jsonResp({ ok: false, error: error.message }, 500);

        const list = (customers ?? []) as Array<{
          phone: string;
          name: string | null;
          orders_count: number;
          total_spent: string | number;
          last_order_at: string | null;
          dominant_category: string | null;
          top_categories: unknown;
          chronic_flags: unknown;
          value_score: number;
          health_score: number;
          segment: string;
        }>;

        if (list.length === 0) {
          await supabaseAdmin.from("agent_runs").insert({
            agent: "cx",
            kind: "weekly_enrich",
            status: "ok",
            finished_at: new Date().toISOString(),
            summary: "لا يوجد عملاء بحاجة لإثراء.",
            confidence: 100,
            details: { processed: 0 },
          });
          return jsonResp({ ok: true, processed: 0 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        let processed = 0;
        let failed = 0;

        for (const c of list) {
          const profile = {
            name: c.name ?? "—",
            orders: c.orders_count,
            total_spent_yer: Number(c.total_spent),
            last_order_at: c.last_order_at,
            dominant_category: c.dominant_category,
            top_categories: c.top_categories,
            chronic_flags: c.chronic_flags,
            value_score: c.value_score,
            health_score: c.health_score,
            segment: c.segment,
          };
          try {
            const { text } = await generateText({
              model,
              system:
                "أنت محلل قيمة العملاء لصيدلية يمنية. اكتب جملة واحدة (≤ 30 كلمة) بالعربية تصف: السلوك السائد، احتمالية إعادة الشراء، وأفضل توصية تسويقية. لا تذكر أي معلومات لم ترد في البيانات.",
              prompt: `ملف العميل:\n${JSON.stringify(profile)}`,
            });
            const insight = text.trim().slice(0, 400);
            await supabaseAdmin.rpc("save_customer_ai_insight", { _phone: c.phone, _insight: insight });
            processed += 1;
          } catch (e) {
            failed += 1;
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("402") || msg.includes("429")) break;
          }
        }

        const summary = `إثراء ${processed} عميل (${failed} فشل) خلال ${(Date.now() - started) / 1000}ث`;
        await supabaseAdmin.from("agent_runs").insert({
          agent: "cx",
          kind: "weekly_enrich",
          status: failed > 0 ? "warn" : "ok",
          finished_at: new Date().toISOString(),
          summary,
          confidence: 90,
          details: { processed, failed, requested: list.length },
        });

        return jsonResp({ ok: true, processed, failed });
      },
      GET: async () =>
        jsonResp({ ok: true, hint: "POST with x-cron-secret header to enrich top customers." }),
    },
  },
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
