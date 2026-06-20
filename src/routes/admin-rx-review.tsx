// Phase 6B Sprint 5 — Rx Review Admin UI
// All mutations go through Sprint 4 server functions; no direct DB writes.

import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { toast } from "sonner";
import {
  listPrescriptionReviews,
  getPrescriptionReviewDetail,
  assignPrescriptionReview,
  startPrescriptionReview,
  approvePrescription,
  rejectPrescription,
  escalatePrescription,
  returnEscalatedToReview,
} from "@/lib/prescription-review.functions";
import { getPrescriptionFileUrl } from "@/lib/prescription-storage.functions";

const STATUSES = [
  "PENDING_REVIEW",
  "ASSIGNED",
  "IN_REVIEW",
  "ESCALATED",
  "APPROVED",
  "REJECTED",
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  PENDING_REVIEW: "بانتظار المراجعة",
  ASSIGNED: "مُسنَدة",
  IN_REVIEW: "قيد المراجعة",
  ESCALATED: "تصعيد",
  APPROVED: "معتمدة",
  REJECTED: "مرفوضة",
};

const STATUS_TONE: Record<Status, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-sky-100 text-sky-800",
  IN_REVIEW: "bg-indigo-100 text-indigo-800",
  ESCALATED: "bg-rose-100 text-rose-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-zinc-200 text-zinc-800",
};

type Search = { tab: Status; q: string; page: number; rx: string };

function parseSearch(s: Record<string, unknown>): Search {
  const tab = (STATUSES as readonly string[]).includes(String(s.tab))
    ? (s.tab as Status)
    : "PENDING_REVIEW";
  const page = Math.max(1, Number(s.page) || 1);
  return {
    tab,
    q: typeof s.q === "string" ? s.q : "",
    page,
    rx: typeof s.rx === "string" ? s.rx : "",
  };
}

const PAGE_SIZE = 25;

export const Route = createFileRoute("/admin-rx-review")({
  validateSearch: parseSearch,

  head: () => ({
    meta: [
      { title: "مراجعة الروشتات — الإدارة" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <RxReviewPage />
    </AdminGate>
  ),
});

function RxReviewPage() {
  const { tab, q, page, rx } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-primary-deep">مراجعة الروشتات</h1>
            <p className="text-sm text-muted-foreground">
              كل التحويلات تمر عبر Server Functions مع تدقيق كامل وإصدار أحداث.
            </p>
          </div>
          <input
            value={q}
            onChange={(e) =>
              navigate({ search: (p: Search) => ({ ...p, q: e.target.value, page: 1 }) })
            }
            placeholder="بحث بمعرّف الروشتة…"
            className="w-72 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </header>

        <nav className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="حالة المراجعة">
          {STATUSES.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={tab === s}
              onClick={() =>
                navigate({ search: (p: Search) => ({ ...p, tab: s, page: 1 }) })
              }
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tab === s
                  ? "brand-gradient text-primary-foreground shadow-card"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </nav>

        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,420px)]">
          <ReviewList
            tab={tab}
            q={q}
            page={page}
            selectedRx={rx}
            onSelect={(id) =>
              navigate({ search: (p: Search) => ({ ...p, rx: id }) })
            }
            onPage={(np) =>
              navigate({ search: (p: Search) => ({ ...p, page: np }) })
            }
          />
          <aside className="min-h-[200px] rounded-2xl border border-border bg-card p-3">
            {rx ? (
              <ReviewDetail prescriptionId={rx} />
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">
                اختر روشتة من القائمة لعرض التفاصيل.
              </p>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── List ────────────────────────────────────────────────────────────────
function ReviewList({
  tab,
  q,
  page,
  selectedRx,
  onSelect,
  onPage,
}: {
  tab: Status;
  q: string;
  page: number;
  selectedRx: string;
  onSelect: (id: string) => void;
  onPage: (n: number) => void;
}) {
  const listFn = useServerFn(listPrescriptionReviews);
  const offset = (page - 1) * PAGE_SIZE;
  const query = useQuery({
    queryKey: ["rx-review-list", tab, q, page],
    queryFn: () =>
      listFn({
        data: {
          status: tab,
          search: q || undefined,
          limit: PAGE_SIZE,
          offset,
        },
      }),
    staleTime: 10_000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        جارٍ التحميل…
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        تعذّر التحميل: {(query.error as Error).message}
      </div>
    );
  }

  const { rows, total } = query.data!;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>{total} روشتة</span>
        <span>
          صفحة {page} / {totalPages}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          لا توجد روشتات في هذه الحالة.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.prescription_id}>
              <button
                onClick={() => onSelect(r.prescription_id)}
                className={`block w-full px-3 py-3 text-start transition hover:bg-accent ${
                  selectedRx === r.prescription_id ? "bg-accent" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-primary-deep">
                    {r.customer_name ?? "—"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground" dir="ltr">
                  <span>{r.prescription_id}</span>
                  <span>{r.customer_phone ?? "—"}</span>
                  <span>{new Date(r.updated_at).toLocaleString("ar-EG")}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg bg-secondary px-3 py-1 text-xs font-bold disabled:opacity-40"
        >
          السابق
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg bg-secondary px-3 py-1 text-xs font-bold disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </div>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────
function ReviewDetail({ prescriptionId }: { prescriptionId: string }) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getPrescriptionReviewDetail);
  const detail = useQuery({
    queryKey: ["rx-review-detail", prescriptionId],
    queryFn: () => detailFn({ data: { prescriptionId } }),
    staleTime: 5_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rx-review-detail", prescriptionId] });
    qc.invalidateQueries({ queryKey: ["rx-review-list"] });
  };

  const assignFn = useServerFn(assignPrescriptionReview);
  const startFn = useServerFn(startPrescriptionReview);
  const approveFn = useServerFn(approvePrescription);
  const rejectFn = useServerFn(rejectPrescription);
  const escalateFn = useServerFn(escalatePrescription);
  const returnFn = useServerFn(returnEscalatedToReview);

  const wrap = (label: string, runner: () => Promise<unknown>) =>
    useMutation({
      mutationFn: runner,
      onSuccess: () => {
        toast.success(`${label} ✓`);
        invalidate();
      },
      onError: (e: Error) => toast.error(`${label}: ${e.message}`),
    });

  const assign = wrap("تم الإسناد", () => assignFn({ data: { prescriptionId } }));
  const start = wrap("بدأت المراجعة", () => startFn({ data: { prescriptionId } }));
  const approve = wrap("اعتُمدت", () => approveFn({ data: { prescriptionId } }));
  const escalateRun = (reason: string) =>
    escalateFn({ data: { prescriptionId, reason } });
  const rejectRun = (reason: string) =>
    rejectFn({ data: { prescriptionId, reason } });
  const returnBack = wrap("أُعيدت للمراجعة", () =>
    returnFn({ data: { prescriptionId } }),
  );

  if (detail.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</p>;
  }
  if (detail.isError) {
    return (
      <p className="p-4 text-sm text-rose-700">
        تعذّر التحميل: {(detail.error as Error).message}
      </p>
    );
  }

  const d = detail.data!;
  const status = d.review.status as Status;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-primary-deep">
            {d.prescription?.customer_name ?? "—"}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-y-0.5 text-[11px] text-muted-foreground" dir="ltr">
          <dt>Prescription</dt><dd>{d.review.prescription_id}</dd>
          <dt>Correlation</dt><dd>{d.correlation_ref}</dd>
          <dt>Phone</dt><dd>{d.prescription?.customer_phone ?? "—"}</dd>
          <dt>Reviewer</dt><dd>{d.review.reviewer_id ?? "—"}</dd>
          <dt>Updated</dt><dd>{new Date(d.review.updated_at).toLocaleString("ar-EG")}</dd>
        </dl>
      </header>

      <Actions
        status={status}
        onAssign={() => assign.mutate()}
        onStart={() => start.mutate()}
        onApprove={() => approve.mutate()}
        onReject={async () => {
          const r = prompt("سبب الرفض؟");
          if (!r) return;
          try { await rejectRun(r); toast.success("تم الرفض"); invalidate(); }
          catch (e) { toast.error((e as Error).message); }
        }}
        onEscalate={async () => {
          const r = prompt("سبب التصعيد؟");
          if (!r) return;
          try { await escalateRun(r); toast.success("تم التصعيد"); invalidate(); }
          catch (e) { toast.error((e as Error).message); }
        }}
        onReturn={() => returnBack.mutate()}
      />

      <section>
        <h3 className="mb-1 text-xs font-black text-muted-foreground">الملفات</h3>
        {d.files.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد ملفات.</p>
        ) : (
          <ul className="space-y-1">
            {d.files.map((f) => (
              <FileRow key={f.id} fileId={f.id} mime={f.mime_type} />
            ))}
          </ul>
        )}
      </section>

      <ExtractionContext extraction={(d as any).extraction} prescriptionId={prescriptionId} />

      <section>
        <h3 className="mb-1 text-xs font-black text-muted-foreground">سجل التتبع</h3>
        <ol className="max-h-72 overflow-auto rounded-xl border border-border bg-secondary/40 p-2 text-[11px]">
          {d.timeline.length === 0 ? (
            <li className="text-muted-foreground">لا توجد أحداث.</li>
          ) : (
            d.timeline.map((t, i) => (
              <li key={i} className="border-b border-border/40 py-1 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{t.label}</span>
                  <span className="text-muted-foreground" dir="ltr">
                    {new Date(t.at).toLocaleString("ar-EG")} · {t.kind}
                  </span>
                </div>
              </li>
            ))
          )}
        </ol>
      </section>

      {d.escalations.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-black text-muted-foreground">التصعيدات</h3>
          <ul className="space-y-1 text-[11px]">
            {d.escalations.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-card p-2">
                <div className="flex justify-between gap-2">
                  <span className="font-bold">{e.reason}</span>
                  <span className="text-muted-foreground">{e.status}</span>
                </div>
                {e.resolution_note && (
                  <p className="mt-1 text-muted-foreground">↪ {e.resolution_note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Actions({
  status,
  onAssign,
  onStart,
  onApprove,
  onReject,
  onEscalate,
  onReturn,
}: {
  status: Status;
  onAssign: () => void;
  onStart: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEscalate: () => void;
  onReturn: () => void;
}) {
  const btn =
    "rounded-xl px-3 py-1.5 text-xs font-black transition disabled:opacity-40";
  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING_REVIEW" && (
        <button onClick={onAssign} className={`${btn} brand-gradient text-primary-foreground`}>
          إسناد لي
        </button>
      )}
      {status === "ASSIGNED" && (
        <button onClick={onStart} className={`${btn} brand-gradient text-primary-foreground`}>
          بدء المراجعة
        </button>
      )}
      {status === "IN_REVIEW" && (
        <>
          <button onClick={onApprove} className={`${btn} bg-emerald-600 text-white`}>اعتماد</button>
          <button onClick={onReject} className={`${btn} bg-zinc-700 text-white`}>رفض</button>
          <button onClick={onEscalate} className={`${btn} bg-rose-600 text-white`}>تصعيد</button>
        </>
      )}
      {status === "ESCALATED" && (
        <>
          <button onClick={onReturn} className={`${btn} bg-indigo-600 text-white`}>إعادة للمراجعة</button>
          <button onClick={onApprove} className={`${btn} bg-emerald-600 text-white`}>اعتماد</button>
          <button onClick={onReject} className={`${btn} bg-zinc-700 text-white`}>رفض</button>
        </>
      )}
      {(status === "APPROVED" || status === "REJECTED") && (
        <span className="text-xs text-muted-foreground">لا توجد إجراءات متاحة.</span>
      )}
    </div>
  );
}

function FileRow({ fileId, mime }: { fileId: string; mime: string | null }) {
  const signFn = useServerFn(getPrescriptionFileUrl);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const open = async () => {
    setBusy(true);
    try {
      const res = await signFn({ data: { fileId, audience: "admin" } });
      setUrl(res.url);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px]">
      <span className="truncate" dir="ltr">{fileId.slice(0, 8)}… · {mime ?? "?"}</span>
      <button
        onClick={open}
        disabled={busy}
        className="rounded-lg bg-primary px-2 py-1 text-[10px] font-black text-primary-foreground disabled:opacity-50"
      >
        {busy ? "…" : url ? "فتح مجدداً" : "فتح"}
      </button>
    </li>
  );
}

function ExtractionContext({ extraction, prescriptionId }: { extraction: any; prescriptionId: string }) {
  if (!extraction) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
        لا يوجد استخراج AI بعد لهذه الروشتة.
      </section>
    );
  }
  const eff = (extraction.reviewer_edits ?? {}) as any;
  const origMeds = (extraction.medications ?? []) as Array<{ name: string; dose?: string | null; duration?: string | null }>;
  const editedMeds = eff.medications as typeof origMeds | undefined;
  const confidence = Number(extraction.confidence ?? 0);
  const lowConf = confidence < 80;
  const hasDiff = !!editedMeds;
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-black text-muted-foreground">سياق استخراج AI</h3>
        <Link
          to="/admin-rx-extraction-edit"
          search={{ prescriptionId }}
          className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-black text-white"
        >
          فتح صفحة الاعتماد/التعديل
        </Link>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-full bg-secondary px-2 py-0.5">حالة: {extraction.status}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5">tier: {extraction.model_tier}</span>
        <span className={`rounded-full px-2 py-0.5 font-bold ${lowConf ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          ثقة: {confidence}%
        </span>
        {extraction.reviewer_approved_at && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">معتمد</span>
        )}
        {hasDiff && !extraction.reviewer_approved_at && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">يوجد تعديلات بشرية</span>
        )}
      </div>
      <ul className="max-h-40 overflow-auto space-y-0.5 text-[11px]">
        {(editedMeds ?? origMeds).slice(0, 8).map((m, i) => {
          const orig = origMeds[i];
          const changed = hasDiff && orig && (orig.name !== m.name || (orig.dose ?? "") !== (m.dose ?? "") || (orig.duration ?? "") !== (m.duration ?? ""));
          return (
            <li key={i} className={changed ? "rounded bg-amber-50 px-1" : ""}>
              <b>{m.name}</b>{m.dose ? ` — ${m.dose}` : ""}{m.duration ? ` (${m.duration})` : ""}
              {changed && orig && (
                <span className="ml-2 text-[10px] text-muted-foreground line-through">
                  {orig.name}{orig.dose ? ` — ${orig.dose}` : ""}{orig.duration ? ` (${orig.duration})` : ""}
                </span>
              )}
            </li>
          );
        })}
        {(editedMeds ?? origMeds).length === 0 && <li className="text-muted-foreground">لا توجد أدوية مستخرجة.</li>}
      </ul>
      {extraction.error && <p className="mt-2 text-[10px] text-rose-700">⚠ {extraction.error}</p>}
    </section>
  );
}
