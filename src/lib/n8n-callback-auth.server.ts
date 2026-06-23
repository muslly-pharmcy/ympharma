// Verify an HMAC-SHA256 signature on inbound n8n callbacks.
// n8n must send `x-n8n-signature: sha256=<hex>` computed over the RAW request body
// using N8N_CALLBACK_SECRET. We compare in constant time.
import { createHmac, timingSafeEqual } from "crypto";

export function verifyN8nSignature(rawBody: string, headerValue: string | null): boolean {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || !headerValue) return false;
  const provided = headerValue.startsWith("sha256=") ? headerValue.slice(7) : headerValue;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
