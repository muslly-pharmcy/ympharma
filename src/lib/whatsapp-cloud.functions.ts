import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  confirmed: "تم التأكيد",
  shipped: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function normalizePhone(raw: string): string {
  const d = (raw || "").replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("967")) return d;
  if (d.startsWith("0")) return "967" + d.slice(1);
  if (d.length === 9) return "967" + d;
  return d;
}

export const sendWhatsAppOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      orderId: z.string().min(1),
      customerName: z.string().min(1),
      customerPhone: z.string().min(1),
      status: z.string().min(1),
      trackUrl: z.string().url().optional(),
      languageCode: z.string().optional(), // e.g. "ar" or "ar_SA"
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Require staff/owner — don't allow random authenticated callers to spam.
    const { data: ownerRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["owner", "admin"])
      .maybeSingle();
    const { data: permRow } = await context.supabase
      .from("staff_permissions")
      .select("permission")
      .eq("user_id", context.userId)
      .eq("permission", "orders")
      .maybeSingle();
    if (!ownerRow && !permRow) throw new Error("Forbidden");

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const template = process.env.WHATSAPP_TEMPLATE_NAME;
    if (!token || !phoneId || !template) {
      throw new Error("WhatsApp Cloud API is not configured");
    }

    const to = normalizePhone(data.customerPhone);
    if (!to) throw new Error("Invalid customer phone");

    const statusLabel = STATUS_LABEL[data.status] ?? data.status;
    const trackUrl = data.trackUrl ?? "https://muslly.com/track?id=" + encodeURIComponent(data.orderId);
    const lang = data.languageCode ?? "ar";

    // Template body params (must match the approved template variables order):
    // {{1}} customer name, {{2}} order id, {{3}} status label, {{4}} track url
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: lang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: data.customerName },
              { type: "text", text: data.orderId },
              { type: "text", text: statusLabel },
              { type: "text", text: trackUrl },
            ],
          },
        ],
      },
    };

    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    // Log the attempt for auditing.
    try {
      await context.supabase.rpc("log_activity", {
        _action: res.ok ? "whatsapp.sent" : "whatsapp.failed",
        _entity_type: "order",
        _entity_id: data.orderId,
        _details: {
          to,
          status: data.status,
          httpStatus: res.status,
          response: json,
        } as any,
      });
    } catch {
      /* ignore logging failure */
    }

    if (!res.ok) {
      const err: any = (json as any)?.error;
      const msg = err?.message || `WhatsApp API ${res.status}`;
      throw new Error(msg);
    }

    const wamid = ((json as any)?.messages?.[0]?.id as string) ?? null;
    return { ok: true, wamid };
  });
