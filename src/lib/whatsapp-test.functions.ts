import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Quick connectivity test — calls the Meta Graph API with the configured
 * template and a single recipient. Useful for the admin "test" button. */
export const testWhatsAppCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ to: z.string().min(6) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // owner/admin only
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["owner", "admin"])
      .limit(1);
    if (!roleRows || roleRows.length === 0) throw new Error("Forbidden");

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const template = process.env.WHATSAPP_TEMPLATE_NAME;
    const config = {
      hasToken: Boolean(token),
      hasPhoneId: Boolean(phoneId),
      hasTemplate: Boolean(template),
      templateName: template ?? null,
    };
    if (!token || !phoneId || !template) {
      return { ok: false, config, error: "إعدادات WhatsApp ناقصة" };
    }

    const digits = data.to.replace(/\D+/g, "");
    const to = digits.startsWith("0") ? "967" + digits.slice(1) : digits.startsWith("967") ? digits : digits.length === 9 ? "967" + digits : digits;

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: "ar" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "اختبار" },
              { type: "text", text: "TEST-001" },
              { type: "text", text: "تم التأكيد" },
              { type: "text", text: "https://muslly.com/track?id=TEST-001" },
            ],
          },
        ],
      },
    };

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({} as any));
    return { ok: res.ok, httpStatus: res.status, response: JSON.stringify(json), config };
  });

