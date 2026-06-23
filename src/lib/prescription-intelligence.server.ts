// Phase 3 — Prescription Intelligence (AI vision)
// Server-only. Uses Lovable AI Gateway (gemini multimodal) to extract medicines
// from a prescription image URL, then checks current stock for each.
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ExtractedSchema = z.object({
  medicines: z.array(
    z.object({
      name: z.string().min(1),
      dosage: z.string().optional().nullable(),
      frequency: z.string().optional().nullable(),
      confidence: z.number().min(0).max(1).optional(),
    }),
  ),
  isValid: z.boolean(),
  notes: z.string().optional().nullable(),
});

export type ExtractedMedicine = {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  confidence?: number;
};

export type ProductLookupResult = {
  id: string;
  name: string;
  stock_qty: number;
  price: number | null;
} | null;

export type ProductLookupFn = (name: string) => Promise<ProductLookupResult>;

export type PrescriptionMedicineMatch = {
  name: string;
  dosage: string | null;
  frequency: string | null;
  confidence: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  inStock: boolean;
  stockQty: number;
  priceYer: number | null;
};

export type PrescriptionAnalysisResult = {
  isValid: boolean;
  notes: string;
  medicines: PrescriptionMedicineMatch[];
  missingMedicines: string[];
};

const SYSTEM = `أنت صيدلي خبير في تحليل صور الوصفات الطبية المكتوبة بالعربية أو الإنجليزية.
حلّل الصورة واستخرج قائمة الأدوية فقط (اسم الدواء، الجرعة إن وُجدت، التكرار).
- إذا الصورة غير واضحة أو ليست وصفة طبية: isValid=false.
- لا تخترع أدوية غير موجودة في الصورة.
- اكتب أسماء الأدوية بنفس صياغتها في الوصفة (احتفظ بالاسم التجاري إن ظهر).
أعد ردك كـ JSON صالح فقط بهذه البنية:
{"medicines":[{"name":"...","dosage":"...","frequency":"...","confidence":0.0}],"isValid":true,"notes":"..."}`;

function safeParseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  return JSON.parse(trimmed);
}

/**
 * Pure matcher — testable without DB or AI.
 * Maps each extracted medicine through `lookup` and computes stock/missing.
 */
export async function matchExtractedMedicines(
  extracted: { isValid: boolean; notes?: string | null; medicines: ExtractedMedicine[] },
  lookup: ProductLookupFn,
): Promise<PrescriptionAnalysisResult> {
  if (!extracted.isValid || extracted.medicines.length === 0) {
    return {
      isValid: false,
      notes: extracted.notes ?? "الوصفة غير صالحة أو غير مقروءة.",
      medicines: [],
      missingMedicines: [],
    };
  }

  const matches: PrescriptionMedicineMatch[] = [];
  const missing: string[] = [];

  for (const m of extracted.medicines) {
    const matched = await lookup(m.name);
    const inStock = !!matched && (matched.stock_qty ?? 0) > 0;
    if (!matched || !inStock) missing.push(m.name);

    matches.push({
      name: m.name,
      dosage: m.dosage ?? null,
      frequency: m.frequency ?? null,
      confidence: m.confidence ?? 0.5,
      matchedProductId: matched?.id ?? null,
      matchedProductName: matched?.name ?? null,
      inStock,
      stockQty: matched?.stock_qty ?? 0,
      priceYer: matched?.price ?? null,
    });
  }

  return {
    isValid: true,
    notes: extracted.notes ?? "",
    medicines: matches,
    missingMedicines: missing,
  };
}

/** Default lookup against the products table using ILIKE substring match. */
export const defaultProductLookup: ProductLookupFn = async (name) => {
  const { data } = await supabaseAdmin
    .from("products")
    .select("id, name, stock_qty, price")
    .ilike("name", `%${name}%`)
    .order("stock_qty", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as ProductLookupResult;
};

/** Best-effort error log so failures surface in admin tools without crashing. */
async function logExtractionFailure(imageUrl: string, attempts: number, err: unknown) {
  try {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "unknown";
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    await supabaseAdmin.from("error_logs").insert({
      level: "error",
      source: "prescription-intelligence",
      message: `Gemini extraction failed after ${attempts} attempt(s): ${message.slice(0, 500)}`,
      stack: stack ? stack.slice(0, 4000) : null,
      extra: { imageUrl: imageUrl.slice(0, 500), attempts } as never,
    } as never);
  } catch {
    /* swallow — logging must never break the caller */
  }
}

export async function analyzePrescriptionImage(
  imageUrl: string,
  opts: { maxAttempts?: number } = {},
): Promise<PrescriptionAnalysisResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-3-flash-preview");
  const maxAttempts = Math.max(1, Math.min(opts.maxAttempts ?? 3, 5));

  let extracted: z.infer<typeof ExtractedSchema> | null = null;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { text } = await generateText({
        model,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "حلّل هذه الوصفة الطبية واستخرج الأدوية بصيغة JSON المحددة." },
              { type: "image", image: new URL(imageUrl) },
            ],
          },
        ],
      });
      extracted = ExtractedSchema.parse(safeParseJson(text));
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      console.error(
        `[prescription-intel] AI extraction attempt ${attempt}/${maxAttempts} failed`,
        err,
      );
      if (attempt < maxAttempts) {
        // Exponential backoff with jitter: 500ms, 1.2s, 2.4s ...
        const delay = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  if (!extracted) {
    await logExtractionFailure(imageUrl, maxAttempts, lastErr);
    return {
      isValid: false,
      notes: "فشل تحليل الصورة آلياً بعد عدة محاولات. ستتم المراجعة يدوياً.",
      medicines: [],
      missingMedicines: [],
    };
  }

  return matchExtractedMedicines(extracted, defaultProductLookup);
}
