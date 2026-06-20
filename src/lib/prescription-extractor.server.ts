// Phase 7 — AI Prescription Analyzer (server-only)
// Reads a prescription_files row, downloads image, runs Gemini Flash;
// if confidence < 80, escalates to Gemini Pro. If still < 80, marks 'review'
// and inserts into prescription_reviews. Otherwise marks 'done'.
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const REVIEW_THRESHOLD = 80;
const MAX_ATTEMPTS = 3;

const ExtractionSchema = z.object({
  medications: z.array(z.object({
    name: z.string(),
    dose: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
  })).default([]),
  doctor_name: z.string().optional().nullable(),
  prescription_date: z.string().optional().nullable().describe("ISO date YYYY-MM-DD if visible"),
  diagnosis: z.string().optional().nullable(),
  allergies: z.array(z.string()).default([]),
  interactions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100).describe("0-100 self-rated extraction confidence"),
});

type Extraction = z.infer<typeof ExtractionSchema>;

const PROMPT_RX = `أنت مساعد طبي يقرأ صور الروشتات. استخرج فقط ما هو مكتوب بوضوح. لا تخمّن.
- الأدوية: الاسم التجاري والجرعة والمدة.
- اسم الطبيب، التاريخ (ISO YYYY-MM-DD)، التشخيص إن وُجد.
- الحساسيات والتفاعلات الدوائية إن ذُكرت صراحةً.
- قيّم ثقتك من 0 إلى 100. إذا كانت الصورة غير واضحة، اخفض الثقة.
أعد JSON فقط بالحقول المطلوبة.`;

const PROMPT_INSURANCE = `أنت مساعد يقرأ بطاقات/مستندات التأمين الطبي. استخرج:
- الأدوية والجرعة والمدة (إن ذُكرت)
- اسم الطبيب، التاريخ، التشخيص
- الحساسيات والتفاعلات (إن وُجدت)
- قيّم ثقتك 0-100.
أعد JSON فقط.`;

async function loadImageAsDataUrl(fileId: string): Promise<{ url: string; mime: string }> {
  const { data: file, error } = await supabaseAdmin
    .from("prescription_files")
    .select("bucket,object_path,mime_type,legacy_blob_id")
    .eq("id", fileId)
    .maybeSingle();
  if (error || !file) throw new Error(`file_not_found: ${fileId}`);

  // Prefer blob bytes if available
  if (file.legacy_blob_id) {
    const { data: blob, error: be } = await supabaseAdmin
      .from("prescription_image_blobs")
      .select("content_bytes, content_type")
      .eq("id", file.legacy_blob_id)
      .maybeSingle();
    if (!be && blob?.content_bytes) {
      // content_bytes returned as base64 string (bytea via PostgREST)
      const b64 = typeof blob.content_bytes === "string"
        ? blob.content_bytes
        : Buffer.from(blob.content_bytes as unknown as ArrayBuffer).toString("base64");
      return { url: `data:${blob.content_type || file.mime_type};base64,${b64}`, mime: blob.content_type || file.mime_type };
    }
  }

  // Otherwise pull from storage and base64-encode
  const { data: dl, error: de } = await supabaseAdmin.storage.from(file.bucket).download(file.object_path);
  if (de || !dl) throw new Error(`download_failed: ${de?.message ?? "no_data"}`);
  const arr = new Uint8Array(await dl.arrayBuffer());
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  const b64 = Buffer.from(bin, "binary").toString("base64");
  return { url: `data:${file.mime_type};base64,${b64}`, mime: file.mime_type };
}

async function runModel(args: {
  modelId: string;
  prompt: string;
  imageUrl: string;
}): Promise<Extraction> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("missing_LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway(args.modelId);

  const { output } = await generateText({
    model,
    output: Output.object({ schema: ExtractionSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: args.prompt },
          { type: "image", image: args.imageUrl },
        ],
      },
    ],
  });
  return output;
}

export async function extractPrescriptionFile(extractionId: string): Promise<{
  status: "done" | "review" | "failed";
  confidence: number;
  modelUsed: string;
}> {
  // Load extraction row
  const { data: row, error: loadErr } = await supabaseAdmin
    .from("prescription_extractions")
    .select("id, prescription_file_id, prescription_id, source_type, attempts")
    .eq("id", extractionId)
    .maybeSingle();
  if (loadErr || !row) throw new Error("extraction_not_found");

  await supabaseAdmin
    .from("prescription_extractions")
    .update({ status: "processing", attempts: (row.attempts ?? 0) + 1 } as never)
    .eq("id", extractionId);

  try {
    const { url } = await loadImageAsDataUrl(row.prescription_file_id);
    const prompt = row.source_type === "insurance" ? PROMPT_INSURANCE : PROMPT_RX;

    // Tier 1 — flash
    let modelUsed = "google/gemini-2.5-flash";
    let tier: "flash" | "pro" = "flash";
    let result = await runModel({ modelId: modelUsed, prompt, imageUrl: url });

    // Tier 2 — escalate to pro if low confidence
    if ((result.confidence ?? 0) < REVIEW_THRESHOLD) {
      try {
        modelUsed = "google/gemini-2.5-pro";
        tier = "pro";
        result = await runModel({ modelId: modelUsed, prompt, imageUrl: url });
      } catch (e) {
        console.warn("[rx-extract] pro fallback failed, keeping flash result", e);
      }
    }

    const confidence = Math.max(0, Math.min(100, Number(result.confidence ?? 0)));
    const needsReview = confidence < REVIEW_THRESHOLD;

    await supabaseAdmin
      .from("prescription_extractions")
      .update({
        status: needsReview ? "review" : "done",
        model_tier: tier,
        model_used: modelUsed,
        confidence,
        medications: result.medications as never,
        doctor_name: result.doctor_name ?? null,
        prescription_date: result.prescription_date ?? null,
        diagnosis: result.diagnosis ?? null,
        allergies: result.allergies as never,
        interactions: result.interactions as never,
        raw_response: result as never,
        error: null,
      } as never)
      .eq("id", extractionId);

    if (needsReview) {
      // Open a human review (idempotent on prescription_id)
      await supabaseAdmin
        .from("prescription_reviews")
        .upsert(
          { prescription_id: row.prescription_id, status: "PENDING_REVIEW" } as never,
          { onConflict: "prescription_id" } as never,
        );
      await supabaseAdmin.from("staff_alerts").insert({
        kind: "ai_extraction_low_confidence",
        severity: "warn",
        title: "روشتة بحاجة لمراجعة بشرية",
        body: `prescription=${row.prescription_id} confidence=${confidence} model=${modelUsed}`,
        entity_type: "prescription_extraction",
        entity_id: extractionId,
        payload: { extraction_id: extractionId, prescription_id: row.prescription_id, confidence, model: modelUsed },
      } as never);
    }

    return { status: needsReview ? "review" : "done", confidence, modelUsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const nextAttempts = (row.attempts ?? 0) + 1;
    const dead = nextAttempts >= MAX_ATTEMPTS;
    await supabaseAdmin
      .from("prescription_extractions")
      .update({
        status: dead ? "failed" : "pending",
        error: msg.slice(0, 500),
        next_attempt_at: new Date(Date.now() + Math.min(60, nextAttempts * 5) * 60_000).toISOString(),
      } as never)
      .eq("id", extractionId);

    if (dead) {
      await supabaseAdmin.from("staff_alerts").insert({
        kind: "ai_extraction_failed",
        severity: "error",
        title: "فشل استخراج روشتة AI نهائياً",
        body: `prescription=${row.prescription_id} err=${msg}`.slice(0, 500),
        entity_type: "prescription_extraction",
        entity_id: extractionId,
        payload: { extraction_id: extractionId, prescription_id: row.prescription_id, error: msg },
      } as never);
    }
    return { status: "failed", confidence: 0, modelUsed: "error" };
  }
}

/** Process up to N pending extractions whose next_attempt_at is due. */
export async function processPendingExtractions(limit = 5): Promise<{
  processed: number;
  results: Array<{ id: string; status: string; confidence: number }>;
}> {
  const { data: rows, error } = await supabaseAdmin
    .from("prescription_extractions")
    .select("id")
    .in("status", ["pending"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  const results: Array<{ id: string; status: string; confidence: number }> = [];
  for (const r of rows ?? []) {
    try {
      const res = await extractPrescriptionFile((r as { id: string }).id);
      results.push({ id: (r as { id: string }).id, status: res.status, confidence: res.confidence });
    } catch (e) {
      console.error("[rx-extract] worker error", e);
    }
  }
  return { processed: results.length, results };
}
