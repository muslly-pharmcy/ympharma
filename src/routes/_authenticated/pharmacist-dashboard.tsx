// Pharmacist dashboard: live queue of prescription approval requests.
// Gated to admin/owner roles (no "pharmacist" role exists in app_role enum).
// Realtime via supabase.channel inside useEffect with cleanup; approve/reject
// call typed server functions backed by requireSupabaseAuth.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  approvePrescription,
  rejectPrescription,
} from "@/lib/pharmacist-approvals.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pharmacist-dashboard")({
  component: PharmacistDashboard,
});

type ApprovalRow = {
  id: string;
  customer_message: string | null;
  extracted_medicines: unknown;
  missing_medicines: string[] | null;
  status: string;
  created_at: string;
  payload: Record<string, unknown>;
};

function PharmacistDashboard() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const approveFn = useServerFn(approvePrescription);
  const rejectFn = useServerFn(rejectPrescription);

  // Role check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) navigate({ to: "/" });
        return;
      }
      const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: u.user.id, _role: "owner" }),
      ]);
      if (cancelled) return;
      if (!isAdmin && !isOwner) {
        toast.error("هذه الصفحة للمشرفين فقط");
        navigate({ to: "/" });
        return;
      }
      setAuthorized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("agent_approval_requests")
        .select(
          "id, customer_message, extracted_medicines, missing_medicines, status, created_at, payload",
        )
        .eq("action_type", "approve_prescription")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as ApprovalRow[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("pharmacist-approvals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_approval_requests",
          filter: "action_type=eq.approve_prescription",
        },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [authorized]);

  const onApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approveFn({ data: { approvalId: id } });
      toast.success("تمت الموافقة");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت الموافقة");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: string) => {
    const reason = (rejectNotes[id] ?? "").trim();
    if (!reason) {
      toast.error("اكتب سبب الرفض");
      return;
    }
    setBusyId(id);
    try {
      await rejectFn({ data: { approvalId: id, reason } });
      toast.success("تم الرفض");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفض");
    } finally {
      setBusyId(null);
    }
  };

  if (authorized === null) {
    return (
      <div className="container mx-auto p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <main className="container mx-auto p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">لوحة الصيدلي</h1>
        <Badge variant="secondary">{rows.length} طلب قيد المراجعة</Badge>
      </header>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            لا توجد طلبات قيد المراجعة 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => {
            const meds = Array.isArray(r.extracted_medicines)
              ? (r.extracted_medicines as Array<{ name?: string }>)
              : [];
            const missing = r.missing_medicines ?? [];
            return (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="text-base">
                      {r.customer_message ?? "وصفة بحاجة لمراجعة"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ar")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {meds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {meds.map((m, i) => (
                        <Badge key={i} variant="outline">
                          {m.name ?? "دواء"}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {missing.length > 0 && (
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      ناقص: {missing.join("، ")}
                    </div>
                  )}
                  <Textarea
                    placeholder="سبب الرفض (مطلوب عند الرفض فقط)"
                    value={rejectNotes[r.id] ?? ""}
                    onChange={(e) =>
                      setRejectNotes((p) => ({ ...p, [r.id]: e.target.value }))
                    }
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => onApprove(r.id)}
                      disabled={busyId === r.id}
                      className="gap-2"
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      موافقة
                    </Button>
                    <Button
                      onClick={() => onReject(r.id)}
                      disabled={busyId === r.id}
                      variant="destructive"
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      رفض
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
