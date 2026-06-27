// AI Clinical Copilot — adapted to the real schema.
// Uses Lovable AI Gateway (LOVABLE_API_KEY) and real columns on
// agent_approval_requests. No fictional patient_* tables.

import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { logger } from "@/core/observability/Logger";
import { checkPromptSafety } from "@/core/ai-safety/AISafetyGuard";

const CHAT_MODEL = "google/gemini-3-flash-preview";
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
}

export interface ClinicalRecommendation {
  id: string;
  type: "approve" | "review" | "reject" | "modify";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  suggestedAction?: string;
  evidence?: Array<{ source: string }>;
}

export interface ClinicalReport {
  prescriptionId: string;
  medications: Medication[];
  recommendations: ClinicalRecommendation[];
  riskScore: number;
  summary: string;
  confidence: number;
  generatedAt: string;
}

const cache = new Map<string, { report: ClinicalReport; ts: number }>();

async function ensureAdmin(supabase: any, userId: string): Promise<void> {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
  if (!isAdmin && !isOwner) throw new Error("غير مصرح: تحتاج صلاحية مدير");
}

function calculateRiskScore(recs: ClinicalRecommendation[]): number {
  let score = 0;
  for (const r of recs) {
    if (r.severity === "critical") score += 25;
    else if (r.severity === "high") score += 15;
    else if (r.severity === "medium") score += 7;
    else score += 2;
  }
  return Math.min(100, score);
}

function parseJsonBlock(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export const analyzePrescriptionWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ prescriptionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await ensureAdmin(supabase, userId);
    const { prescriptionId } = data;

    const hit = cache.get(prescriptionId);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return { success: true as const, report: hit.report, cached: true };
    }

    const { data: req, error } = await supabase
      .from("agent_approval_requests")
      .select("id, payload, extracted_medicines, customer_message, ai_analysis")
      .eq("id", prescriptionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("الروشتة غير موجودة");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY غير مهيّأ");

    // Seed medications from existing extracted_medicines if any
    let medications: Medication[] = Array.isArray(req.extracted_medicines)
      ? (req.extracted_medicines as any[]).map((m) => ({
          name: String(m.name ?? m.medicine ?? ""),
          dosage: m.dosage ?? m.dose,
          frequency: m.frequency,
          route: m.route,
        }))
      : [];

    const sourceText = String(
      req.customer_message ?? (req.payload as any)?.text ?? "",
    ).slice(0, 4000);

    const safety = checkPromptSafety(sourceText);
    const safePrompt = safety.redactedPrompt ?? sourceText;

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway(CHAT_MODEL);

    // Step 1: extract medications if we don't have them
    if (medications.length === 0 && safePrompt.trim()) {
      try {
        const { text } = await generateText({
          model,
          system:
            "أنت صيدلي سريري. استخرج الأدوية من نص الروشتة وأعد JSON بهذه الصيغة فقط: " +
            `{"medications":[{"name":"...","dosage":"...","frequency":"...","route":"..."}],"confidence":0.0-1.0}`,
          prompt: safePrompt,
        });
        const parsed = parseJsonBlock(text) as
          | { medications?: Medication[]; confidence?: number }
          | null;
        if (parsed?.medications) medications = parsed.medications;
      } catch (e) {
        logger.warn("medication extraction failed", { error: (e as Error).message });
      }
    }

    // Step 2: clinical reasoning over the medications
    let recommendations: ClinicalRecommendation[] = [];
    let summary = "";
    let confidence = 0.7;

    if (medications.length > 0) {
      try {
        const { text } = await generateText({
          model,
          system:
            "أنت صيدلي سريري في صيدلية يمنية. حلّل قائمة الأدوية وأرجع JSON فقط بالصيغة: " +
            `{"recommendations":[{"type":"approve|review|reject|modify","severity":"critical|high|medium|low","title":"...","description":"...","suggestedAction":"..."}],"summary":"...","confidence":0.0-1.0}` +
            ". ركّز على التداخلات الدوائية، تكرار العلاج، الجرعات غير المعتادة. لا تخترع معلومات.",
          prompt: `الأدوية:\n${JSON.stringify(medications, null, 2)}`,
        });
        const parsed = parseJsonBlock(text) as
          | {
              recommendations?: ClinicalRecommendation[];
              summary?: string;
              confidence?: number;
            }
          | null;
        if (parsed) {
          recommendations = (parsed.recommendations ?? []).map((r) => ({
            id: crypto.randomUUID(),
            type: r.type ?? "review",
            severity: r.severity ?? "medium",
            title: r.title ?? "توصية",
            description: r.description ?? "",
            suggestedAction: r.suggestedAction,
            evidence: [{ source: "تحليل ذكاء اصطناعي — Lovable AI" }],
          }));
          summary = parsed.summary ?? "";
          if (typeof parsed.confidence === "number") confidence = parsed.confidence;
        }
      } catch (e) {
        logger.error("clinical reasoning failed", { error: (e as Error).message });
      }
    }

    const riskScore = calculateRiskScore(recommendations);
    if (!summary) {
      summary =
        recommendations.length === 0
          ? "✅ لا توجد توصيات أو مخاطر واضحة في هذه الروشتة."
          : `⚠️ ${recommendations.length} توصية سريرية بحاجة للمراجعة.`;
    }

    const report: ClinicalReport = {
      prescriptionId,
      medications,
      recommendations,
      riskScore,
      summary,
      confidence,
      generatedAt: new Date().toISOString(),
    };

    await supabase
      .from("agent_approval_requests")
      .update({
        extracted_medicines: medications,
        ai_analysis: { recommendations, summary } as any,
        ai_confidence: confidence,
        ai_risk_score: riskScore,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", prescriptionId);

    cache.set(prescriptionId, { report, ts: Date.now() });
    return { success: true as const, report, cached: false };
  });

export const chatWithAICopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        message: z.string().min(1).max(5000),
        prescriptionId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await ensureAdmin(supabase, userId);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY غير مهيّأ");

    const safety = checkPromptSafety(data.message);
    if (!safety.allowed) {
      return { success: false as const, error: `الرسالة مرفوضة: ${safety.reasons.join(", ")}` };
    }
    const cleanMessage = safety.redactedPrompt ?? data.message;

    let systemPrompt =
      "أنت مساعد صيدلي سريري خبير لصيدلية يمنية. تجيب بدقة ومسؤولية باللغة العربية. " +
      "إذا لم تكن متأكدًا قل ذلك صراحة، ولا تخترع جرعات أو تداخلات.";

    if (data.prescriptionId) {
      const { data: req } = await supabase
        .from("agent_approval_requests")
        .select("extracted_medicines, ai_analysis")
        .eq("id", data.prescriptionId)
        .maybeSingle();
      if (req?.extracted_medicines) {
        systemPrompt += `\n\nالأدوية الحالية: ${JSON.stringify(req.extracted_medicines).slice(0, 1500)}`;
      }
    }

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway(CHAT_MODEL),
        system: systemPrompt,
        prompt: cleanMessage,
      });
      return { success: true as const, response: text };
    } catch (e) {
      const msg = (e as Error).message;
      logger.error("copilot chat failed", { error: msg });
      if (msg.includes("429")) {
        return { success: false as const, error: "تم تجاوز حد الطلبات. حاول لاحقًا." };
      }
      if (msg.includes("402")) {
        return { success: false as const, error: "نفدت رصيد Lovable AI. أضف رصيدًا للاستمرار." };
      }
      return { success: false as const, error: msg };
    }
  });

export const getAIAnalysisHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await ensureAdmin(supabase, userId);

    const { data: rows, error } = await supabase
      .from("agent_approval_requests")
      .select(
        "id, status, ai_confidence, ai_risk_score, ai_analyzed_at, extracted_medicines, ai_analysis, created_at",
      )
      .not("ai_analyzed_at", "is", null)
      .order("ai_analyzed_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { history: rows ?? [] };
  });

export const clearAICache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await ensureAdmin(supabase, userId);
    const cleared = cache.size;
    cache.clear();
    return { success: true as const, cleared };
  });
