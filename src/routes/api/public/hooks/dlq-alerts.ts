// src/routes/api/public/hooks/dlq-alerts.ts
// ============================================================
// DLQ ALERTS SYSTEM — Dead Letter Queue Monitoring & Alerting
// ============================================================
// الوظيفة: مراقبة الأحداث الفاشلة في DLQ وإرسال تنبيهات للمسؤولين
// الأمان: verifyCronSecret + UNIQUE(user_id, dedupe_key) لمنع التكرار لكل مستخدم
// ============================================================

import { createFileRoute } from "@tanstack/react-router";
import { verifyCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/dlq-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ─── 1. المصادقة ───
        const authResponse = verifyCronSecret(request);
        if (authResponse) return authResponse;

        // ─── 2. استيراد supabaseAdmin ديناميكياً ───
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // ─── 3. جلب الأحداث الفاشلة في DLQ خلال الساعة الأخيرة ───
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const { data: failedEvents, error: fetchError } = await supabaseAdmin
          .from("agent_events_dlq")
          .select("id, event_name, error, created_at, resolved")
          .gte("created_at", oneHourAgo)
          .eq("resolved", false)
          .order("created_at", { ascending: false });

        if (fetchError) {
          console.error("DLQ fetch error:", fetchError);
          return Response.json({ error: fetchError.message }, { status: 500 });
        }

        // ─── 4. إذا كان هناك أحداث فاشلة، أرسل تنبيهات ───
        const results = {
          alerts_sent: 0,
          failed_count: failedEvents?.length || 0,
          errors: [] as Array<{ id: string; event: string; error: string }>,
        };

        if (failedEvents && failedEvents.length > 0) {
          // تجميع رسالة التنبيه
          const message = `🚨 [DLQ Alert] ${failedEvents.length} حدثاً فاشلاً خلال الساعة الأخيرة.\n` +
            failedEvents.map((e: any, i: number) => `${i+1}. ${e.event_name}: ${e.error?.slice(0, 100)}`).join("\n");

          // إرسال التنبيه إلى جميع المسؤولين (admin + owner)
          const { data: admins } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .in("role", ["admin", "owner"]);

          if (admins && admins.length > 0) {
            const dedupeKey = `dlq_burst:${new Date().toISOString().slice(0, 13)}`;

            for (const admin of admins) {
              const { error: insertError } = await supabaseAdmin
                .from("operations_alerts")
                .upsert({
                  user_id: admin.user_id,
                  alert_type: "dlq_burst",
                  message: message,
                  dedupe_key: dedupeKey,
                  created_at: new Date().toISOString(),
                } as any, {
                  onConflict: "user_id, dedupe_key",
                  ignoreDuplicates: true,
                });

              if (!insertError) {
                results.alerts_sent++;
              }
            }
          }

          results.errors = failedEvents.map((e: any) => ({
            id: e.id,
            event: e.event_name,
            error: e.error,
          }));
        }

        return Response.json(results);
      },
    },
  },
});
