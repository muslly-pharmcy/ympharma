// Server-side strict validation for uploaded files (prescriptions bucket).
// Enforces: content-type, size limit, and magic-byte sniffing.
// Called after client upload (before commit) and by the 12-hour audit cron.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIMES = new Set<string>([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif",
  "image/heic", "image/heif", "image/gif", "image/bmp",
  "image/tiff", "image/tif", "application/pdf",
]);

export type ValidationResult =
  | { ok: true; mime: string; size: number }
  | { ok: false; code: string; message: string };

/** Sniff content type from the first bytes. Returns null if unknown. */
export function sniffMime(buf: Uint8Array): string | null {
  if (buf.length < 4) return null;
  const b = buf;
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  // BMP
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  // PDF
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  // RIFF .... WEBP
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  // TIFF (II or MM)
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)) return "image/tiff";
  // ISO BMFF (HEIC/HEIF/AVIF): bytes 4..7 == "ftyp"
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

function arabicErrorFor(code: string, ctx?: { size?: number; mime?: string }): string {
  switch (code) {
    case "missing": return "الملف غير موجود في التخزين.";
    case "empty": return "الملف فارغ — يرجى إعادة الرفع.";
    case "too_large":
      return `حجم الملف ${ctx?.size ? (ctx.size / 1024 / 1024).toFixed(2) : "?"}MB يتجاوز الحد الأقصى 5MB.`;
    case "mime_not_allowed":
      return `نوع الملف (${ctx?.mime ?? "غير معروف"}) غير مسموح — صور أو PDF فقط.`;
    case "mime_mismatch":
      return "محتوى الملف لا يطابق النوع المعلن — قد يكون تالفاً أو مزوراً.";
    case "unknown_format":
      return "تعذر التعرف على صيغة الملف — استخدم JPG/PNG/PDF.";
    default: return "فشل التحقق من الملف.";
  }
}

/** Core validation: downloads first chunk + checks size from storage. */
export async function validateStorageObject(
  bucket: string,
  path: string,
): Promise<ValidationResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Metadata: existence + declared size/mime.
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listing, error: listErr } = await supabaseAdmin.storage
    .from(bucket).list(dir, { search: name, limit: 1 });
  if (listErr) return { ok: false, code: "missing", message: arabicErrorFor("missing") };
  const meta = listing?.[0];
  if (!meta) return { ok: false, code: "missing", message: arabicErrorFor("missing") };

  const size = (meta.metadata as { size?: number } | null)?.size ?? 0;
  const declaredMime = String(
    (meta.metadata as { mimetype?: string } | null)?.mimetype ?? ""
  ).toLowerCase();

  if (size <= 0) return { ok: false, code: "empty", message: arabicErrorFor("empty") };
  if (size > MAX_BYTES) return { ok: false, code: "too_large", message: arabicErrorFor("too_large", { size }) };
  if (declaredMime && !ALLOWED_MIMES.has(declaredMime)) {
    return { ok: false, code: "mime_not_allowed", message: arabicErrorFor("mime_not_allowed", { mime: declaredMime }) };
  }

  // 2. Download first 32 bytes for magic-byte sniffing.
  const { data: blob, error: dlErr } = await supabaseAdmin.storage.from(bucket).download(path);
  if (dlErr || !blob) return { ok: false, code: "missing", message: arabicErrorFor("missing") };
  const head = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
  const sniffed = sniffMime(head);
  if (!sniffed) return { ok: false, code: "unknown_format", message: arabicErrorFor("unknown_format") };
  if (!ALLOWED_MIMES.has(sniffed)) {
    return { ok: false, code: "mime_not_allowed", message: arabicErrorFor("mime_not_allowed", { mime: sniffed }) };
  }
  // Cross-check declared vs sniffed (treat jpg/jpeg as equivalent; ignore if declared empty).
  if (declaredMime) {
    const norm = (m: string) => m === "image/jpg" ? "image/jpeg" : m === "image/tif" ? "image/tiff" : m;
    if (norm(declaredMime) !== norm(sniffed)) {
      // Allow heic family aliases.
      const heicFamily = new Set(["image/heic", "image/heif"]);
      if (!(heicFamily.has(norm(declaredMime)) && heicFamily.has(norm(sniffed)))) {
        return { ok: false, code: "mime_mismatch", message: arabicErrorFor("mime_mismatch") };
      }
    }
  }

  return { ok: true, mime: sniffed, size };
}

/**
 * Public-callable (authenticated) validator. Used by the upload page
 * AFTER the client upload but BEFORE saving the prescription row.
 * On failure, deletes the offending object and returns a clear message.
 */
export const validateUploadedPrescriptionFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      path: z.string().trim().min(1).max(512)
        .refine((p) => p.startsWith("uploads/"), "path must start with uploads/"),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<ValidationResult> => {
    const res = await validateStorageObject("prescriptions", data.path);
    if (!res.ok) {
      // Hard-delete invalid objects to prevent abuse.
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from("prescriptions").remove([data.path]);
      } catch (e) {
        console.warn("[validateUploadedPrescriptionFile] cleanup failed", e);
      }
    }
    return res;
  });
