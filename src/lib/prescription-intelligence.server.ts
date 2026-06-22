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

export async function analyzePrescriptionImage(
  imageUrl: string,
): Promise<PrescriptionAnalysisResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-3-flash-preview");

  let extracted: z.infer<typeof ExtractedSchema>;
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
  } catch (err) {
    console.error("[prescription-intel] AI extraction failed", err);
    return {
      isValid: false,
      notes: "فشل تحليل الصورة آلياً. ستتم المراجعة يدوياً.",
      medicines: [],
      missingMedicines: [],
    };
  }

  if (!extracted.isValid || extracted.medicines.length === 0) {
    return {
      isValid: false,
      notes: extracted.notes ?? "الوصفة غير صالحة أو غير مقروءة.",
      medicines: [],
      missingMedicines: [],
    };
  }

  // Match each medicine against products table (ILIKE substring match).
  const matches: PrescriptionMedicineMatch[] = [];
  const missing: string[] = [];

  for (const m of extracted.medicines) {
    const { data: prod } = await supabaseAdmin
      .from("products")
      .select("id, name, stock_qty, price_yer")
      .ilike("name", `%${m.name}%`)
      .order("stock_qty", { ascending: false })
      .limit(1)
      .maybeSingle();

    const matched = (prod ?? null) as
      | { id: string; name: string; stock_qty: number; price_yer: number | null }
      | null;
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
      priceYer: matched?.price_yer ?? null,
    });
  }

  return {
    isValid: true,
    notes: extracted.notes ?? "",
    medicines: matches,
    missingMedicines: missing,
  };
}
