// Phase 6D++ — server functions for AI approval decisions + customer WhatsApp notify
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ACTION_LABEL: Record<string, string> = {
  create_order: "إنشاء طلب",
  approve_prescription: "موافقة على روشتة",
  inventory_change: "تعديل مخزون",
  transfer: "تحويل بين فروع",
  price_change: "تعديل سعر",
  refund: "استرجاع",
};

const PHARMACY_NAME = "صيدلية المصلي";
const OPT_OUT_URL = "https://muslly.com/unsubscribe";

const DecideInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional().nullable(),
});

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecideInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Authorize: owner/admin/pharmacist only
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
    const { data: isPharm } = await supabase.rpc("has_role", { _user_id: userId, _role: "pharmacist" });
    if (!isAdmin && !isOwner && !isPharm) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load request
    const { data: reqRow, error: loadErr } = await supabaseAdmin
      .from("agent_approval_requests")
      .select("id, status, action_type, user_phone, payload, correlation_id")
      .eq("id", data.id)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!reqRow) throw new Error("not_found");
    if (reqRow.status !== "pending") throw new Error("already_decided");

    // Update decision
    const { error: upErr } = await supabaseAdmin
      .from("agent_approval_requests")
      .update({
        status: data.status,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      } as never)
      .eq("id", data.id)
      .eq("status", "pending");
    if (upErr) throw upErr;

    // Enqueue WhatsApp dispatch (best-effort; alert on failure)
    let notified = false;
    if (reqRow.user_phone) {
      const templateId = data.status === "approved" ? "AGENT_APPROVAL_APPROVED" : "AGENT_APPROVAL_REJECTED";
      const actionLabel = ACTION_LABEL[reqRow.action_type as string] ?? reqRow.action_type;
      const requestRef = String(reqRow.id).slice(0, 8).toUpperCase();
      const reason = (data.note ?? "").trim() || "غير محدد";
      const note = (data.note ?? "").trim();
      const body =
        data.status === "approved"
          ? `🏥 *${PHARMACY_NAME}*\n\n✅ تمت الموافقة على طلبك\n\n🆔 المرجع: *${requestRef}*\n📝 النوع: ${actionLabel}\n${note ? `💬 ملاحظة: ${note}\n` : ""}\nسنبدأ التنفيذ ونوافيك بالمستجدات.\n\n🔕 لإلغاء الاشتراك: ${OPT_OUT_URL}`
          : `🏥 *${PHARMACY_NAME}*\n\n⚠️ تعذّر تنفيذ طلبك\n\n🆔 المرجع: *${requestRef}*\n📝 النوع: ${actionLabel}\n❌ السبب: ${reason}\n\nيمكنك الرد على هذه الرسالة للتواصل مع موظف.\n\n🔕 لإلغاء الاشتراك: ${OPT_OUT_URL}`;

      const { error: dispErr } = await supabaseAdmin
        .from("whatsapp_notification_dispatch")
        .insert({
          event_id: crypto.randomUUID(),
          event_name: templateId,
          correlation_id: reqRow.correlation_id ?? null,
          recipient_phone: reqRow.user_phone,
          template_id: templateId,
          rendered_body: body,
          status: "pending",
        } as never);

      if (dispErr) {
        // Alert staff — do not fail the whole decision
        await supabaseAdmin.from("staff_alerts").insert({
          kind: "ai_notify_failure",
          severity: "error",
          title: "فشل إنشاء إشعار WhatsApp لقرار AI",
          body: `approval=${data.id} status=${data.status} err=${dispErr.message}`.slice(0, 500),
          entity_type: "agent_approval_request",
          entity_id: data.id,
          payload: { approval_id: data.id, status: data.status, error: dispErr.message },
        } as never);
      } else {
        notified = true;
      }
    }

    return { ok: true, notified };
  });
