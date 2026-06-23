// Pre-send HMAC compatibility check for the n8n outbound path.
// Produces the EXACT bytes we would send, every reasonable signature variant
// n8n might compute, and the verifier roundtrip result. On mismatch, returns
// a labeled diff so you can see WHICH format n8n is using.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Variant = {
  id: string;
  label: string;
  header_name: string;
  header_value: string;
  algorithm: string;
  encoding: "hex" | "base64";
  prefixed: boolean;
};

export type HmacPreflightResult = {
  ok: boolean;
  secret_present: boolean;
  webhook_url_present: boolean;
  canonical_body: string;
  body_bytes: number;
  body_sha256_hex: string;
  outbound: {
    header_name: "x-lovable-signature";
    header_value: string;
    encoding: "hex";
    algorithm: "sha256";
  } | null;
  variants: Variant[];
  roundtrip: { passes: boolean; reason: string };
  expected_n8n_format: string;
  notes: string[];
  // Optional: result of a probe POST to n8n with `dry_run: true`
  probe?: {
    attempted: boolean;
    status?: number;
    body_preview?: string;
    error?: string;
  };
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .in("role", ["admin", "owner"])
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("صلاحيات الأدمن مطلوبة");
}

export const runHmacPreflight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        sample_post_id: z.string().uuid().optional(),
        probe: z.boolean().optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ context, data }): Promise<HmacPreflightResult> => {
    await assertAdmin(context);
    const { createHmac, createHash } = await import("crypto");
    const { verifyN8nSignature } = await import("./n8n-callback-auth.server");

    const secret = process.env.N8N_CALLBACK_SECRET ?? "";
    const url = process.env.N8N_WEBHOOK_URL ?? "";
    const notes: string[] = [];

    const payload = {
      event: "publish",
      post_id: data.sample_post_id ?? "00000000-0000-0000-0000-000000000000",
      platform: "facebook",
      caption: "HMAC preflight — لا تنشر",
      cta: "preflight",
      product_id: null,
      dry_run: true,
    };
    const rawBody = JSON.stringify(payload);
    const bodyBytes = Buffer.byteLength(rawBody, "utf8");
    const bodySha256 = createHash("sha256").update(rawBody).digest("hex");

    if (!secret) notes.push("N8N_CALLBACK_SECRET غير مضبوط — لا يمكن توقيع الطلب.");
    if (!url) notes.push("N8N_WEBHOOK_URL غير مضبوط — لا يمكن إرسال الطلب.");

    const variants: Variant[] = [];
    let outbound: HmacPreflightResult["outbound"] = null;
    let roundtripPasses = false;
    let roundtripReason = "تم تخطي الفحص لعدم وجود السر.";

    if (secret) {
      const sha256Hex = createHmac("sha256", secret).update(rawBody).digest("hex");
      const sha256B64 = createHmac("sha256", secret).update(rawBody).digest("base64");
      const sha1Hex = createHmac("sha1", secret).update(rawBody).digest("hex");

      outbound = {
        header_name: "x-lovable-signature",
        header_value: `sha256=${sha256Hex}`,
        encoding: "hex",
        algorithm: "sha256",
      };

      variants.push(
        { id: "v1", label: "SHA-256 hex مع البادئة (الحالي — ما نرسله)", header_name: "x-lovable-signature", header_value: `sha256=${sha256Hex}`, algorithm: "sha256", encoding: "hex", prefixed: true },
        { id: "v2", label: "SHA-256 hex بدون بادئة", header_name: "x-lovable-signature", header_value: sha256Hex, algorithm: "sha256", encoding: "hex", prefixed: false },
        { id: "v3", label: "SHA-256 base64 مع البادئة", header_name: "x-lovable-signature", header_value: `sha256=${sha256B64}`, algorithm: "sha256", encoding: "base64", prefixed: true },
        { id: "v4", label: "SHA-256 base64 بدون بادئة", header_name: "x-lovable-signature", header_value: sha256B64, algorithm: "sha256", encoding: "base64", prefixed: false },
        { id: "v5", label: "SHA-1 hex (قديم — لا يجب استخدامه)", header_name: "x-lovable-signature", header_value: `sha1=${sha1Hex}`, algorithm: "sha1", encoding: "hex", prefixed: true },
        { id: "v6", label: "نفس التوقيع باسم رأس inbound (x-n8n-signature)", header_name: "x-n8n-signature", header_value: `sha256=${sha256Hex}`, algorithm: "sha256", encoding: "hex", prefixed: true },
      );

      // Roundtrip: feed our outbound signature into the inbound verifier.
      // This proves both ends use the SAME (algo + encoding + raw body) contract.
      roundtripPasses = verifyN8nSignature(rawBody, `sha256=${sha256Hex}`);
      roundtripReason = roundtripPasses
        ? "✔ verifier inbound يقبل توقيعنا outbound — العقد متطابق."
        : "✘ verifier inbound يرفض توقيعنا — السر مختلف بين outbound و inbound، أو الجسم تمت إعادة تسلسله.";
      if (!roundtripPasses) {
        notes.push("تأكد أن n8n يحسب HMAC على RAW body قبل أي JSON.parse، وأنه يستخدم نفس قيمة N8N_CALLBACK_SECRET.");
      }
    }

    // Optional probe — only fires when explicitly requested AND url + secret exist.
    let probe: HmacPreflightResult["probe"] | undefined;
    if (data.probe && url && secret) {
      probe = { attempted: true };
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8_000);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lovable-signature": outbound!.header_value,
            "x-preflight": "1",
          },
          body: rawBody,
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const text = await res.text().catch(() => "");
        probe.status = res.status;
        probe.body_preview = text.slice(0, 400);
      } catch (e) {
        probe.error = (e as Error).message;
      }
    }

    return {
      ok: !!secret && !!url && roundtripPasses,
      secret_present: !!secret,
      webhook_url_present: !!url,
      canonical_body: rawBody,
      body_bytes: bodyBytes,
      body_sha256_hex: bodySha256,
      outbound,
      variants,
      roundtrip: { passes: roundtripPasses, reason: roundtripReason },
      expected_n8n_format:
        'HMAC_SHA256(secret = N8N_CALLBACK_SECRET, message = raw_request_body) → hex، يُرسل في header "x-lovable-signature: sha256=<hex>".',
      notes,
      probe,
    };
  });
