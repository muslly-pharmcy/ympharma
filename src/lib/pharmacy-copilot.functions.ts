import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";


// ---------- Read helpers (admin-only) ----------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isOwner && !isAdmin) {
    const { data: hasOrders } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _perm: "orders" });
    if (!hasOrders) throw new Error("forbidden");
  }
}

export const fetchInventoryIntel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("inventory_intel");
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchSalesOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("sales_opportunities");
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchCtoHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("cto_health");
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchExecAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("executive_alerts");
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchLatestExecReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("latest_executive_report");
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchRevenueByCondition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any).rpc("revenue_by_condition", { _days: 30 });
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchDecliningProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any).rpc("declining_products");
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchChronicOverdue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any).rpc("chronic_overdue", { _grace: 1.5 });
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchAutoBundleCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any).rpc("auto_bundle_candidates", { _days: 90 });
    if (error) throw new Error(error.message);
    return data;
  });

export const enqueueChronicRefills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    discount_pct: z.number().int().min(5).max(50).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertOwnerOrAdmin(context);
    const { data: out, error } = await (context.supabase as any).rpc("enqueue_chronic_refills", {
      _discount_pct: data.discount_pct ?? 15,
      _limit: data.limit ?? 50,
    });
    if (error) throw new Error(error.message);
    return out;
  });


// ---------- Triggers (owner/admin only) ----------

async function assertOwnerOrAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isOwner } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "owner" });
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isOwner && !isAdmin) throw new Error("forbidden");
}

export const runWeeklyReportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwnerOrAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("weekly_exec_report_build");
    if (error) throw new Error(error.message);
    return data;
  });

export const runWeeklyEnrichNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(100).optional() }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertOwnerOrAdmin(context);
    const limit = data.limit ?? 30;
    const cronSecret = process.env.CRON_SECRET ?? "";
    if (!cronSecret) throw new Error("CRON_SECRET not configured");
    const origin = process.env.LOVABLE_PROJECT_URL ?? `https://ympharma.lovable.app`;
    const url = `${origin}/api/public/hooks/weekly-ai-enrich`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": cronSecret },
      body: JSON.stringify({ limit }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out?.error || `enrich ${res.status}`);
    return out;
  });

/**
 * Owner/Admin: rotate the scheduled background jobs so they call internal
 * endpoints with the current x-cron-secret header instead of the public anon key.
 * Reads CRON_SECRET from server env and pushes it into cron.schedule via SQL.
 */
export const rotateCronSecretNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwnerOrAdmin(context);
    const cronSecret = process.env.CRON_SECRET ?? "";
    if (!cronSecret || cronSecret.length < 16) {
      throw new Error("CRON_SECRET missing or too short (≥16 chars required)");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const baseUrl =
      process.env.LOVABLE_PROJECT_URL ??
      `https://project--4d4aad01-9bf4-4d8b-acab-e51a06a17c63.lovable.app`;
    const { data, error } = await supabaseAdmin.rpc("rotate_cron_secret", {
      _secret: cronSecret,
      _base_url: baseUrl,
    });
    if (error) throw new Error(error.message);
    return data;
  });

// ---------- AI Executive Copilot ----------

const CopilotInput = z.object({
  question: z.string().min(1).max(2000),
  agent: z
    .enum(["ceo", "cto", "marketing", "sales", "inventory", "cx", "operations", "bi"])
    .default("ceo")
    .optional(),
});

const AGENT_SYSTEM: Record<string, string> = {
  ceo: "أنت مدير تنفيذي (CEO) لصيدلية يمنية. تجيب باختصار وحزم. ركّز على الإيراد، النمو، الفرص، والمخاطر. اعطِ توصيات عملية مرتبة حسب الأثر.",
  cto: "أنت مدير تقني (CTO). راجع الأخطاء والاستقرار. حدد أولويات الإصلاح حسب الأثر على المستخدم والإيراد.",
  marketing: "أنت مدير تسويق. اقترح حملات WhatsApp قابلة للتطبيق فوراً، باستخدام الشرائح الحالية والتصنيفات الدوائية.",
  sales: "أنت مدير مبيعات. ابحث عن فرص cross-sell/upsell وحزم (bundles) عالية الهامش.",
  inventory: "أنت مدير مخزون. توقّع النفاد، أوصِ بكميات إعادة الطلب، وحدّد المخزون الميت أو القارب على الانتهاء.",
  cx: "أنت مدير تجربة العملاء. حدد فرص الاحتفاظ وتقليل churn للمرضى المزمنين.",
  operations: "أنت مدير العمليات. ركّز على كفاءة الطلبات، التأخير، وخدمة التوصيل في صنعاء.",
  bi: "أنت محلل أعمال. أعطِ أرقاماً وتحليلاً سببياً وقارن الأسبوع بالأسبوع.",
};

export const askExecutiveCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CopilotInput.parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY غير مهيأ");

    // Pull a compact, real-time data snapshot from Postgres
    const [dash, inv, sales, cto, alerts] = await Promise.all([
      context.supabase.rpc("exec_dashboard"),
      context.supabase.rpc("inventory_intel"),
      context.supabase.rpc("sales_opportunities"),
      context.supabase.rpc("cto_health"),
      context.supabase.rpc("executive_alerts"),
    ]);
    for (const r of [dash, inv, sales, cto, alerts]) {
      if (r.error) throw new Error(r.error.message);
    }

    // Trim large arrays to keep tokens reasonable
    const trim = (obj: any) => {
      if (!obj || typeof obj !== "object") return obj;
      const out: any = Array.isArray(obj) ? obj.slice(0, 10) : {};
      if (!Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj)) {
          out[k] = Array.isArray(v) ? v.slice(0, 10) : v;
        }
      }
      return out;
    };

    const snapshot = {
      dashboard: trim(dash.data),
      inventory: trim(inv.data),
      sales: trim(sales.data),
      cto: trim(cto.data),
      alerts: alerts.data,
      now: new Date().toISOString(),
    };

    const agent = data.agent ?? "ceo";
    const system = `${AGENT_SYSTEM[agent]}
- اللغة: العربية.
- استخدم البيانات الحقيقية المرفقة فقط. لا تخترع أرقاماً.
- أعطِ إجابة مختصرة (≤ 200 كلمة) ثم قائمة "الخطوات الموصى بها" مرقمة.
- إذا لا توجد بيانات كافية قل ذلك صراحة.`;

    const prompt = `سؤال المدير: ${data.question}

البيانات الحالية للصيدلية (JSON مقتطف):
\`\`\`json
${JSON.stringify(snapshot)}
\`\`\``;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
    });

    // Log the run for the agents board
    await context.supabase.from("agent_runs").insert({
      agent,
      kind: "copilot_qna",
      status: "ok",
      finished_at: new Date().toISOString(),
      summary: data.question.slice(0, 240),
      confidence: 80,
      details: { question: data.question, answer: text.slice(0, 4000) },
    });

    return { agent, answer: text };
  });
