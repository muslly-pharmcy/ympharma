// Phoenix Invoice Intelligence — OCR + matching pipeline
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractSchema } from "../domain/schemas";

const CHAT_MODEL = "google/gemini-3-flash-preview";

const LineSchema = z.object({
  raw_text: z.string().optional().default(""),
  detected_name: z.string().optional().default(""),
  quantity: z.number().nullable().optional(),
  unit_cost: z.number().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  batch_number: z.string().nullable().optional(),
});

const HeaderSchema = z.object({
  supplier_name: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  ocr_confidence: z.number().min(0).max(1).nullable().optional(),
  lines: z.array(LineSchema).default([]),
});

function parseJsonBlock(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function matchProduct(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  q: string,
): Promise<{ product_id: string | null; confidence: number; source: "exact" | "alias" | "fuzzy" | "unmatched" }> {
  if (!q.trim()) return { product_id: null, confidence: 0, source: "unmatched" };
  const { data, error } = await supabase.rpc(
    "search_medicines_public" as never,
    { _q: q, _limit: 3 } as never,
  );
  if (error || !Array.isArray(data) || data.length === 0) {
    return { product_id: null, confidence: 0, source: "unmatched" };
  }
  const top = data[0] as { id: string; match_source?: string; score?: number };
  const conf = typeof top.score === "number" ? Math.min(1, top.score) : 0.7;
  const source =
    top.match_source === "exact" ? "exact" :
    top.match_source === "alias" ? "alias" : "fuzzy";
  return { product_id: top.id, confidence: conf, source };
}

export const extractInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => extractSchema.parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;

    // 1) Load upload row and mark extracting
    const { data: upload, error: uErr } = await supabase
      .from("invoice_uploads")
      .select("id, storage_path, organization_id, status")
      .eq("id", data.upload_id)
      .single();
    if (uErr || !upload) throw new Error(uErr?.message ?? "upload_not_found");

    await supabase
      .from("invoice_uploads")
      .update({ status: "extracting" } as never)
      .eq("id", data.upload_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("invoice_audit_events").insert({
      upload_id: data.upload_id,
      actor_user_id: userId,
      event_type: "extraction_started",
      payload: {},
    } as never);

    // 2) Signed URL for the image (10 min) so the AI gateway can fetch it
    const { data: signed, error: signErr } = await supabase.storage
      .from("invoice-uploads")
      .createSignedUrl((upload as { storage_path: string }).storage_path, 600);
    if (signErr || !signed?.signedUrl) throw new Error("signed_url_failed");

    // 3) Multimodal extraction
    let extraction: z.infer<typeof HeaderSchema>;
    let rawText = "";
    try {
      const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const model = gateway(CHAT_MODEL);
      const { text } = await generateText({
        model,
        system:
          "You extract structured data from pharmacy supplier invoice photos. " +
          "Support Arabic (RTL), English, and mixed supplier formats. " +
          "Return ONLY a JSON object with keys: supplier_name, invoice_number, invoice_date (YYYY-MM-DD), " +
          "currency, subtotal, tax, total, ocr_confidence (0..1), " +
          "lines: [{raw_text, detected_name, quantity, unit_cost, unit_price, expiry_date (YYYY-MM-DD), batch_number}]. " +
          "Use null for missing values. Do not invent products.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the invoice below. Return JSON only." },
              { type: "image", image: new URL(signed.signedUrl) },
            ],
          },
        ],
      });
      rawText = text;
      const parsed = parseJsonBlock(text);
      extraction = HeaderSchema.parse(parsed ?? {});
    } catch (err) {
      await supabase
        .from("invoice_uploads")
        .update({ status: "failed" } as never)
        .eq("id", data.upload_id);
      await supabaseAdmin.from("invoice_audit_events").insert({
        upload_id: data.upload_id,
        actor_user_id: userId,
        event_type: "extraction_failed",
        payload: { error: (err as Error).message },
      } as never);
      throw new Error(`extraction_failed: ${(err as Error).message}`);
    }

    // 4) Persist header
    const { data: extRow, error: extErr } = await supabase
      .from("invoice_extractions")
      .insert({
        upload_id: data.upload_id,
        supplier_name_raw: extraction.supplier_name ?? null,
        invoice_number: extraction.invoice_number ?? null,
        invoice_date: extraction.invoice_date ?? null,
        currency: extraction.currency ?? null,
        subtotal: extraction.subtotal ?? null,
        tax: extraction.tax ?? null,
        total: extraction.total ?? null,
        ocr_confidence: extraction.ocr_confidence ?? null,
        raw_ocr_text: rawText.slice(0, 20000),
        model_used: CHAT_MODEL,
      } as never)
      .select("id")
      .single();
    if (extErr || !extRow) throw new Error(extErr?.message ?? "extraction_insert_failed");

    // 5) Persist + match lines
    const rows: unknown[] = [];
    for (let i = 0; i < extraction.lines.length; i++) {
      const ln = extraction.lines[i];
      const detected = (ln.detected_name ?? "").trim();
      const match = await matchProduct(supabase, detected);
      rows.push({
        extraction_id: (extRow as { id: string }).id,
        line_no: i + 1,
        raw_text: ln.raw_text ?? null,
        detected_name: detected || null,
        detected_name_normalized: detected.toLowerCase() || null,
        quantity: ln.quantity ?? null,
        unit_cost: ln.unit_cost ?? null,
        unit_price: ln.unit_price ?? null,
        expiry_date: ln.expiry_date ?? null,
        batch_number: ln.batch_number ?? null,
        matched_product_id: match.product_id,
        match_confidence: match.confidence,
        match_source: match.confidence >= 0.75 ? match.source : "unmatched",
        status: "pending",
      });
    }
    if (rows.length) {
      const { error: linesErr } = await supabase
        .from("invoice_line_items")
        .insert(rows as never);
      if (linesErr) throw new Error(linesErr.message);
    }

    await supabase
      .from("invoice_uploads")
      .update({ status: "extracted" } as never)
      .eq("id", data.upload_id);

    await supabaseAdmin.from("invoice_audit_events").insert({
      upload_id: data.upload_id,
      actor_user_id: userId,
      event_type: "extraction_completed",
      payload: {
        lines: rows.length,
        matched: rows.filter((r) => (r as { matched_product_id: string | null }).matched_product_id).length,
        ocr_confidence: extraction.ocr_confidence ?? null,
      },
    } as never);

    return { extraction_id: (extRow as { id: string }).id, lines: rows.length };
  });
