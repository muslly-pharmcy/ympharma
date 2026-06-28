import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";


const THERAPEUTIC_CATEGORIES = [
  "diabetes","hypertension","cardiology","allergy","asthma","gi",
  "antibiotics","neurology","dermatology","pediatrics","womens_health",
  "vitamins","pain","respiratory","ophthalmology","urology","hormonal",
  "oncology","mental_health","other",
] as const;

export const listClassificationsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      status: z.enum(["pending","approved","rejected"]).optional(),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.rpc("list_classifications_admin", {
      _status: data.status,
      _category: data.category,
      _limit: data.limit ?? 200,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const taxonomyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("pharmacy_taxonomy_stats");
    if (error) throw new Error(error.message);
    return data;
  });

export const approveClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      edits: z.record(z.string(), z.unknown()).optional(),
    }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("approve_classification", {
      _id: data.id, _edits: (data.edits ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("reject_classification", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ClassifyInput = z.object({
  scope: z.enum(["unclassified","all"]).default("unclassified"),
  limit: z.number().int().min(1).max(40).default(15),
});

const ItemSchema = z.object({
  product_legacy_id: z.number().int(),
  generic_name: z.string().max(120).optional(),
  active_ingredient: z.string().max(160).optional(),
  therapeutic_category: z.enum(THERAPEUTIC_CATEGORIES).optional(),
  pharmacological_class: z.string().max(120).optional(),
  conditions: z.array(z.string().max(80)).max(8).optional(),
  is_chronic: z.boolean().optional(),
  requires_prescription: z.boolean().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
});

export const runAiClassifierBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ClassifyInput.parse(i ?? {}))
  .handler(async ({ context, data }) => {
    // Authorize: must be admin/owner/products perm
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: hasPerm } = await context.supabase.rpc("has_permission", { _user_id: context.userId, _perm: "products" });
    if (!isOwner && !isAdmin && !hasPerm) throw new Error("forbidden");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service unavailable");

    // Pick products
    let q = context.supabase
      .from("products")
      .select("legacy_id,name,brand,category,description")
      .eq("is_published", true)
      .order("legacy_id", { ascending: true })
      .limit(data.limit);

    if (data.scope === "unclassified") {
      const { data: existing } = await context.supabase
        .from("product_classifications")
        .select("product_legacy_id");
      const exclude = (existing ?? []).map((r) => r.product_legacy_id);
      if (exclude.length) q = q.not("legacy_id", "in", `(${exclude.join(",")})`);
    }

    const { data: products, error: pErr } = await q;
    if (pErr) throw new Error(pErr.message);
    if (!products || products.length === 0) {
      return { processed: 0, upserted: 0, skipped: 0, message: "لا توجد منتجات للتصنيف" };
    }

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const systemPrompt = `أنت صيدلي إكلينيكي خبير. مهمتك تصنيف الأدوية والمنتجات الصيدلانية.
لكل منتج يُعطى لك (اسم + ماركة + فئة + وصف اختياري) أعد JSON بهذه الحقول:
- product_legacy_id (نفس الرقم المعطى)
- generic_name (الاسم العلمي بالإنجليزية، مثل Metformin)
- active_ingredient (المادة الفعالة)
- therapeutic_category: واحدة من: ${THERAPEUTIC_CATEGORIES.join(", ")}
- pharmacological_class: مثل ACE Inhibitors, Beta Blockers, PPI, Biguanide, Statin
- conditions: مصفوفة حالات مرضية بالعربية (مثل: "السكري النوع 2", "ارتفاع ضغط الدم", "ارتجاع المريء")
- is_chronic: true إذا كان دواءً لمرض مزمن (سكري/ضغط/قلب/غدة درقية/كولسترول)
- requires_prescription: true إذا يحتاج وصفة (مضادات حيوية، أدوية الضغط، أدوية السكر، أدوية القلب)
- confidence: 0-100 تقدير ثقتك بالتصنيف

قواعد:
- إذا كان المنتج ليس دواءً (شامبو، صابون، عطر) ضع therapeutic_category="other"، is_chronic=false, requires_prescription=false، confidence منخفض.
- الفيتامينات والمكملات: therapeutic_category="vitamins"، requires_prescription=false.
- مستحضرات التجميل: "dermatology" أو "other".
- منتجات الأطفال (حفاضات، مناديل): "pediatrics".
- لا تترك حقولاً فارغة بدون سبب؛ إن لم تعرف ضع تقديراً مع confidence منخفض.`;

    const userPayload = products.map((p) => ({
      id: p.legacy_id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: (p.description ?? "").slice(0, 240),
    }));

    let items: z.infer<typeof ItemSchema>[] = [];
    try {
      const { experimental_output } = await generateText({
        model,
        system: systemPrompt,
        prompt: `صنّف هذه المنتجات وأعد مصفوفة JSON بنفس الترتيب (${products.length} منتج):\n${JSON.stringify(userPayload)}`,
        experimental_output: Output.object({
          schema: z.object({
            items: z.array(ItemSchema).max(40),
          }),
        }),
      });
      items = (experimental_output?.items ?? []) as z.infer<typeof ItemSchema>[];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("الخدمة مزدحمة، حاول بعد دقيقة");
      if (msg.includes("402")) throw new Error("نفدت أرصدة الذكاء الاصطناعي");
      throw new Error(`AI error: ${msg.slice(0, 200)}`);
    }

    let upserted = 0;
    let skipped = 0;
    for (const it of items) {
      const safe = ItemSchema.safeParse(it);
      if (!safe.success) { skipped++; continue; }
      const payload = {
        ...safe.data,
        status: "pending",
        ai_model: "google/gemini-3-flash-preview",
      };
      const { error: upErr } = await context.supabase.rpc("upsert_classification", { _payload: payload });
      if (upErr) { skipped++; continue; }
      upserted++;
    }

    // Activity log
    await context.supabase.rpc("log_activity", {
      _action: "pharmacy.ai_batch_classify",
      _entity_type: "product_classifications",
      _details: { scope: data.scope, requested: data.limit, processed: products.length, upserted, skipped } as never,
    });

    return { processed: products.length, upserted, skipped };
  });
