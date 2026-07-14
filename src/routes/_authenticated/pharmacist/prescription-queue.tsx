// Phoenix Prescription Intelligence — pharmacist review queue
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listPrescriptionReviews } from "@/lib/prescription-review.functions";

const STATUSES = ["PENDING_REVIEW", "ASSIGNED", "IN_REVIEW", "ESCALATED"] as const;
type Status = (typeof STATUSES)[number];

export const Route = createFileRoute("/_authenticated/pharmacist/prescription-queue")({
  head: () => ({ meta: [{ title: "طابور الوصفات | Muslly" }] }),
  component: QueuePage,
});

function QueuePage() {
  const [status, setStatus] = useState<Status>("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const listFn = useServerFn(listPrescriptionReviews);
  const { data, isLoading } = useQuery({
    queryKey: ["rx-queue", status, search],
    queryFn: () => listFn({ data: { status, search: search || undefined, limit: 50, offset: 0 } }),
  });

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">طابور مراجعة الوصفات</h1>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} إجمالاً</span>
      </div>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        ⚠️ كل نتائج الذكاء الاصطناعي بحاجة إلى مراجعة صيدلي قبل الصرف.
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${status === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <Input placeholder="بحث برقم الوصفة" value={search} onChange={(e) => setSearch(e.target.value)} />
      {isLoading ? <p className="text-sm text-muted-foreground">جاري التحميل…</p> : null}
      <ul className="divide-y rounded-lg border">
        {(data?.rows ?? []).map((r) => (
          <li key={r.prescription_id}>
            <Link
              to="/pharmacist/prescription-review/$id"
              params={{ id: r.prescription_id }}
              className="flex items-center justify-between p-3 hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground truncate">{r.correlation_ref}</div>
                <div className="text-sm font-semibold truncate">{r.customer_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{r.customer_phone ?? ""}</div>
              </div>
              <Badge variant="secondary">{r.status}</Badge>
            </Link>
          </li>
        ))}
        {!isLoading && (data?.rows ?? []).length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">لا توجد وصفات في هذه الحالة.</li>
        )}
      </ul>
    </div>
  );
}
