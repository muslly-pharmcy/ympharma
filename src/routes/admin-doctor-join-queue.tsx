import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminGate } from "@/components/admin/AdminGate";
import { listJoinSubmissions, reviewJoinSubmission } from "@/modules/doctors/api/join.functions";
import { AlertTriangle, CheckCircle2, XCircle, Copy, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin-doctor-join-queue")({
  head: () => ({
    meta: [
      { title: "طلبات انضمام الأطباء — لوحة الإدارة" },
      { name: "description", content: "مراجعة وإدارة طلبات انضمام الأطباء إلى شبكة المسلي الصحية." },
    ],
  }),
  component: () => (
    <AdminGate>
      <DoctorJoinQueue />
    </AdminGate>
  ),
});

type Status = "new" | "reviewing" | "approved" | "rejected" | "duplicate" | "all";

const STATUS_LABEL: Record<Status, string> = {
  new: "جديدة",
  reviewing: "قيد المراجعة",
  approved: "معتمَدة",
  rejected: "مرفوضة",
  duplicate: "مكرّرة",
  all: "الكل",
};

function DoctorJoinQueue() {
  const [status, setStatus] = useState<Status>("new");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const list = useServerFn(listJoinSubmissions);
  const review = useServerFn(reviewJoinSubmission);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["hc-join-queue", status],
    queryFn: () => list({ data: { status, limit: 100 } }),
  });

  const m = useMutation({
    mutationFn: (v: { submission_id: string; decision: "approve" | "reject" | "duplicate" | "reviewing" }) =>
      review({ data: { ...v, reviewer_notes: notesById[v.submission_id] ?? null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hc-join-queue"] }),
  });

  return (
    <main dir="rtl" className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">طلبات انضمام الأطباء</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            راجع الطلبات، اكتشف التكرارات، ثم اعتمِد أو ارفض.
          </p>
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-accent"
        >
          <RefreshCw className={`size-4 ${q.isFetching ? "animate-spin" : ""}`} /> تحديث
        </button>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              s === status ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-accent"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin" /> جارٍ التحميل…
        </div>
      ) : q.data && q.data.length > 0 ? (
        <ul className="space-y-3">
          {q.data.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{s.full_name_ar}</h3>
                    {s.title ? <span className="text-xs text-muted-foreground">— {s.title}</span> : null}
                    {s.duplicate_score >= 60 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        <AlertTriangle className="size-3" /> تكرار محتمل ({s.duplicate_score})
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.phone_e164} {s.email ? `· ${s.email}` : ""} {s.city ? `· ${s.city}` : ""}
                  </p>
                  {s.claimed_specialties?.length ? (
                    <p className="mt-1 text-xs">
                      <span className="text-muted-foreground">التخصصات: </span>
                      {s.claimed_specialties.join("، ")}
                    </p>
                  ) : null}
                  {s.duplicate_of ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                      <Copy className="size-3" /> قد يطابق طبيباً موجوداً: {s.duplicate_of}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                  {STATUS_LABEL[(s.status as Status) ?? "new"]}
                </span>
              </div>

              <textarea
                placeholder="ملاحظات المراجعة (اختياري)"
                className="mt-3 h-16 w-full rounded-lg border border-border bg-background p-2 text-sm"
                value={notesById[s.id] ?? s.reviewer_notes ?? ""}
                onChange={(e) => setNotesById((x) => ({ ...x, [s.id]: e.target.value }))}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={m.isPending}
                  onClick={() => m.mutate({ submission_id: s.id, decision: "approve" })}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" /> اعتماد
                </button>
                <button
                  type="button"
                  disabled={m.isPending}
                  onClick={() => m.mutate({ submission_id: s.id, decision: "reject" })}
                  className="inline-flex items-center gap-1 rounded-xl border border-destructive/50 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <XCircle className="size-3.5" /> رفض
                </button>
                <button
                  type="button"
                  disabled={m.isPending}
                  onClick={() => m.mutate({ submission_id: s.id, decision: "duplicate" })}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-500/50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <Copy className="size-3.5" /> تكرار
                </button>
                <button
                  type="button"
                  disabled={m.isPending}
                  onClick={() => m.mutate({ submission_id: s.id, decision: "reviewing" })}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50"
                >
                  قيد المراجعة
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا توجد طلبات في هذه الحالة.
        </div>
      )}
    </main>
  );
}
