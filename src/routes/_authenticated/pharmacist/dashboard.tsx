// src/routes/_authenticated/pharmacist/dashboard.tsx
// PHARMACIST DASHBOARD — Realtime Prescription Management (literal v14 transcription)

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientText } from "@/components/ui/GradientText";
import { Reveal } from "@/components/motion/Reveal";
import { toast } from "sonner";
import { approvePrescription, rejectPrescription } from "@/lib/pharmacist-approvals.functions";

export const Route = createFileRoute("/_authenticated/pharmacist/dashboard")({
  component: PharmacistDashboard,
});

type PrescriptionRequest = {
  id: string;
  status: string;
  payload: any;
  created_at: string;
  customer_id: string;
};

function PharmacistDashboard() {
  const [realtimeStatus, setRealtimeStatus] = useState<Record<string, string>>({});

  const { data: pendingRequests, isLoading, refetch } = useQuery({
    queryKey: ["prescriptions", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_approval_requests")
        .select("id, status, payload, created_at, customer_id")
        .in("status", ["pending", "review", "manual_review"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PrescriptionRequest[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("pharmacist-dashboard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_approval_requests" },
        (payload: any) => {
          setRealtimeStatus((prev) => ({ ...prev, [payload.new.id]: payload.new.status }));
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleApprove = async (id: string) => {
    try {
      await (approvePrescription as any)({ approvalId: id });
      toast.success("✅ تمت الموافقة على الروشتة");
      refetch();
    } catch (err) {
      toast.error("❌ فشل الموافقة: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await (rejectPrescription as any)({ approvalId: id });
      toast.warning("❌ تم رفض الروشتة");
      refetch();
    } catch (err) {
      toast.error("❌ فشل الرفض: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const getAnalysis = (payload: any) => {
    return payload?.analysis || { matched: [], unmatched: [], confidence: 0 };
  };

  if (isLoading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  const activeRequests = pendingRequests || [];

  return (
    <main className="min-h-screen bg-background p-6" dir="rtl">
      <Reveal>
        <header className="mb-6">
          <GradientText className="text-3xl font-bold">📋 لوحة تحكم الصيدلي</GradientText>
          <p className="text-muted-foreground">إدارة الروشتات الواردة والموافقة عليها</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <GlassCard>
            <div className="text-2xl font-bold">{activeRequests.filter(r => r.status === "pending").length}</div>
            <div className="text-sm text-muted-foreground">قيد الانتظار</div>
          </GlassCard>
          <GlassCard>
            <div className="text-2xl font-bold">{activeRequests.filter(r => r.status === "review").length}</div>
            <div className="text-sm text-muted-foreground">قيد المراجعة</div>
          </GlassCard>
          <GlassCard>
            <div className="text-2xl font-bold">{activeRequests.filter(r => r.status === "manual_review").length}</div>
            <div className="text-sm text-muted-foreground">مراجعة يدوية</div>
          </GlassCard>
          <GlassCard>
            <div className="text-2xl font-bold">{activeRequests.filter(r => r.status === "approved").length}</div>
            <div className="text-sm text-muted-foreground">تمت الموافقة</div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          {activeRequests.length === 0 ? (
            <GlassCard>
              <p className="text-center text-lg">🎉 لا توجد روشتات معلقة</p>
              <p className="text-center text-sm text-muted-foreground">جميع الروشتات تمت معالجتها</p>
            </GlassCard>
          ) : (
            activeRequests.map((request) => {
              const analysis = getAnalysis(request.payload);
              const matched = analysis.matched || [];
              const unmatched = analysis.unmatched || [];
              const isManual = request.status === "manual_review";

              return (
                <GlassCard key={request.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-sm">#{request.id.slice(-6)}</div>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                      {isManual ? "مراجعة يدوية" : request.status === "review" ? "قيد المراجعة" : "قيد الانتظار"}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-semibold mb-2">الأدوية المستخرجة</p>
                      {matched.length === 0 ? (
                        <p className="text-sm text-muted-foreground">لا توجد</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {matched.map((med: any, i: number) => (
                            <li key={i}>• {med.name} {med.dosage && `— ${med.dosage}`}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold mb-2">أدوية غير مطابقة</p>
                      {unmatched.length === 0 ? (
                        <p className="text-sm text-muted-foreground">لا يوجد</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {unmatched.map((med: any, i: number) => (
                            <li key={i}>• {med.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => handleReject(request.id)}>✖ رفض</Button>
                    <Button onClick={() => handleApprove(request.id)}>✔ موافقة</Button>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      </Reveal>
    </main>
  );
}
