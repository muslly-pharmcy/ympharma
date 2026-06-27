import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAgentEvents, agentEventStats, markAgentEventProcessed, installEventConsumerSchedule, getEventConsumerSchedule, listScheduleLog, listThrottlingHits, listDlqEvents, replayDlqEvent, bulkReplayDlq, resolveDlqEvent } from "@/lib/event-bus.functions";

export const Route = createFileRoute("/admin-event-bus")({
  head: () => ({ meta: [{ title: "Event Bus — Admin" }] }),
  component: () => (<AdminGate><EventBusPage /></AdminGate>),
});

type Status = "ALL" | "UNPROCESSED" | "PROCESSED";

function EventBusPage() {
  const [status, setStatus] = useState<Status>("UNPROCESSED");
  const [eventName, setEventName] = useState<string>("");
  const [installing, setInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const list = useServerFn(listAgentEvents);
  const stats = useServerFn(agentEventStats);
  const mark = useServerFn(markAgentEventProcessed);
  const installSchedule = useServerFn(installEventConsumerSchedule);
  const getSchedule = useServerFn(getEventConsumerSchedule);
  const fetchLog = useServerFn(listScheduleLog);
  const fetchThrottle = useServerFn(listThrottlingHits);
  const qc = useQueryClient();

  const scheduleQ = useQuery({
    queryKey: ["event_consumer_schedule"],
    queryFn: () => getSchedule(),
    refetchInterval: 60_000,
  });

  const logQ = useQuery({
    queryKey: ["event_consumer_schedule_log"],
    queryFn: () => fetchLog({ data: { limit: 50 } }),
    refetchInterval: 30_000,
  });

  const throttleQ = useQuery({
    queryKey: ["rate_limit_throttle"],
    queryFn: () => fetchThrottle({ data: { limit: 50 } }),
    refetchInterval: 30_000,
  });

  const rowsQ = useQuery({
    queryKey: ["agent_events", status, eventName],
    queryFn: () => list({ data: { status, event_name: eventName || undefined, limit: 100 } }),
    refetchInterval: 15_000,
  });
  const statsQ = useQuery({
    queryKey: ["agent_events_stats"],
    queryFn: () => stats(),
    refetchInterval: 30_000,
  });

  const onMark = async (id: string) => {
    await mark({ data: { id, processor: "admin-manual" } });
    qc.invalidateQueries({ queryKey: ["agent_events"] });
    qc.invalidateQueries({ queryKey: ["agent_events_stats"] });
  };

  const onInstallSchedule = async () => {
    setInstalling(true);
    setInstallMsg(null);
    try {
      const r = await installSchedule();
      const s = r.schedule ?? {};
      setInstallMsg({
        kind: "ok",
        text: `✓ ${s.reinstalled ? "أُعيد تثبيت" : "تم تثبيت"} الجدولة: ${s.job_name ?? "event-consumer-tick"} (${s.schedule ?? "* * * * *"}) — job_id=${s.job_id ?? "—"} · cid=${r.correlation_id.slice(0, 8)}`,
      });
      qc.invalidateQueries({ queryKey: ["event_consumer_schedule"] });
      qc.invalidateQueries({ queryKey: ["event_consumer_schedule_log"] });

    } catch (e: any) {
      setInstallMsg({ kind: "err", text: `✗ فشل التثبيت: ${e?.message ?? String(e)}` });
    } finally {
      setInstalling(false);
    }
  };

  const byEvent = statsQ.data?.by_event ?? {};
  const alerts = statsQ.data?.alerts ?? [];
  const sched = scheduleQ.data?.schedule ?? {};

  return (
    <div dir="rtl" className="mx-auto max-w-6xl p-4 space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Event Bus — مراقبة الأحداث</h1>
          <p className="text-sm text-muted-foreground">آخر 24 ساعة • تحديث تلقائي كل 30 ثانية</p>
        </div>
        <a href="/admin-automation-hub" className="text-sm underline text-primary">→ Automation Hub</a>
      </header>

      <section className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">جدولة المُستهلِك: </span>
          {sched.installed ? (
            <span className="text-emerald-600">
              ✓ مثبَّتة — {sched.job_name} ({sched.schedule}) {sched.active === false ? "· متوقفة" : "· نشطة"}
            </span>
          ) : (
            <span className="text-amber-600">⚠ غير مثبَّتة</span>
          )}
        </div>
        <button
          onClick={onInstallSchedule}
          disabled={installing}
          className="ms-auto rounded bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {installing ? "جارٍ التثبيت..." : (sched.installed ? "Reinstall Schedule" : "Install Schedule")}
        </button>
        {installMsg && (
          <div className={`w-full text-xs ${installMsg.kind === "ok" ? "text-emerald-600" : "text-destructive"}`}>
            {installMsg.text}
          </div>
        )}
      </section>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
          {alerts.map((a, i) => (
            <div key={i} className="text-sm text-destructive">⚠ {a.message}</div>
          ))}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card title="إجمالي الأحداث" value={statsQ.data?.total ?? "—"} />
        <Card title="غير معالَجة" value={statsQ.data?.total_unprocessed ?? "—"} tone={statsQ.data && statsQ.data.total_unprocessed > 0 ? "warn" : "ok"} />
        <Card title="أقدم غير معالَج" value={statsQ.data ? `${Math.round((statsQ.data.oldest_unprocessed_ms ?? 0) / 60000)}m` : "—"} />
        <Card title="أنواع الأحداث" value={Object.keys(byEvent).length} />
      </section>

      <section className="rounded-lg border p-3">
        <h2 className="text-sm font-semibold mb-2">معدّل النجاح/الفشل وزمن المعالجة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-right p-2">الحدث</th>
                <th className="text-right p-2">إجمالي</th>
                <th className="text-right p-2">معالَج</th>
                <th className="text-right p-2">أخطاء</th>
                <th className="text-right p-2">متوسط الزمن</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byEvent).map(([name, s]) => (
                <tr key={name} className="border-t">
                  <td className="p-2 font-mono">{name}</td>
                  <td className="p-2">{s.total}</td>
                  <td className="p-2 text-emerald-600">{s.processed}</td>
                  <td className="p-2 text-destructive">{s.failed}</td>
                  <td className="p-2">{s.processed > 0 ? `${Math.round(s.avg_ms)}ms` : "—"}</td>
                </tr>
              ))}
              {Object.keys(byEvent).length === 0 && (
                <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">لا أحداث في النافذة الزمنية.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">الحالة:</label>
          <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="UNPROCESSED">غير معالَج</option>
            <option value="PROCESSED">معالَج</option>
            <option value="ALL">الكل</option>
          </select>
          <label className="text-sm ms-3">النوع:</label>
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="PrescriptionUploaded / OrderCreated / RefillDue"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
          <button className="ms-auto text-xs underline" onClick={() => rowsQ.refetch()}>تحديث</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-right p-2">الحدث</th>
                <th className="text-right p-2">المصدر</th>
                <th className="text-right p-2">الكيان</th>
                <th className="text-right p-2">الوقت</th>
                <th className="text-right p-2">الحالة</th>
                <th className="text-right p-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {(rowsQ.data?.rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-2 font-mono">{r.event_name}</td>
                  <td className="p-2 text-xs">{r.source}</td>
                  <td className="p-2 text-xs">{r.entity_type ?? "—"}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ""}</td>
                  <td className="p-2 text-xs whitespace-nowrap">{new Date(r.occurred_at).toLocaleString("ar")}</td>
                  <td className="p-2 text-xs">
                    {r.processed_at ? <span className="text-emerald-600">✓ {r.processed_by ?? ""}</span> : <span className="text-amber-600">⏳ pending {r.retry_count > 0 ? `(retry ${r.retry_count})` : ""}</span>}
                    {r.last_error && <div className="text-destructive text-[10px] mt-1">{r.last_error}</div>}
                  </td>
                  <td className="p-2">
                    {!r.processed_at && (
                      <button onClick={() => onMark(r.id)} className="text-xs underline text-primary">تأكيد المعالجة</button>
                    )}
                  </td>
                </tr>
              ))}
              {(rowsQ.data?.rows ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">لا نتائج.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">سجل عمليات الجدولة</h2>
          <button className="text-xs underline" onClick={() => logQ.refetch()}>تحديث</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-right p-2">الوقت</th>
                <th className="text-right p-2">العملية</th>
                <th className="text-right p-2">الحالة</th>
                <th className="text-right p-2">job_id</th>
                <th className="text-right p-2">الجدولة</th>
                <th className="text-right p-2">correlation_id</th>
                <th className="text-right p-2">المنفِّذ</th>
              </tr>
            </thead>
            <tbody>
              {(logQ.data?.rows ?? []).map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-2 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar")}</td>
                  <td className="p-2 text-xs font-mono">{r.action}</td>
                  <td className="p-2 text-xs">
                    {r.status === "ok"
                      ? <span className="text-emerald-600">✓ ok</span>
                      : <span className="text-destructive">✗ error</span>}
                    {r.error && <div className="text-destructive text-[10px] mt-1">{r.error}</div>}
                  </td>
                  <td className="p-2 text-xs">{r.job_id ?? "—"}</td>
                  <td className="p-2 text-xs font-mono">{r.schedule ?? "—"}</td>
                  <td className="p-2 text-[10px] font-mono" title={r.correlation_id}>{r.correlation_id.slice(0, 8)}</td>
                  <td className="p-2 text-[10px] font-mono" title={r.actor_user_id ?? ""}>{r.actor_user_id ? r.actor_user_id.slice(0, 8) : "—"}</td>
                </tr>
              ))}
              {(logQ.data?.rows ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">لا عمليات تثبيت مسجَّلة بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Throttling — آخر طلبات محظورة (place_order / error_logs)</h2>
          <button className="text-xs underline" onClick={() => throttleQ.refetch()}>تحديث</button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          يعرض رؤوس المعدّل التي بلغت الحد الأقصى (≥5). <code>place_order</code> يُحسب لكل رقم هاتف ضمن نافذة 60ث.
          <code>error_logs</code> ينفَّذ تحديده داخل الذاكرة لكل عامل (per-isolate) ولا يَعبر هذه الواجهة — راجع لوحة الأخطاء للتفصيل.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-right p-2">النطاق</th>
                <th className="text-right p-2">النوع</th>
                <th className="text-right p-2">الموضوع</th>
                <th className="text-right p-2">عدد المحاولات</th>
                <th className="text-right p-2">بدء النافذة</th>
                <th className="text-right p-2">آخر محاولة</th>
              </tr>
            </thead>
            <tbody>
              {(throttleQ.data?.rows ?? []).map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="p-2 text-xs font-mono">{r.scope}</td>
                  <td className="p-2 text-xs">{r.subject_kind}</td>
                  <td className="p-2 text-xs font-mono" dir="ltr">{r.subject}</td>
                  <td className={`p-2 text-xs font-bold ${r.count >= 5 ? "text-destructive" : "text-amber-600"}`}>{r.count}</td>
                  <td className="p-2 text-xs whitespace-nowrap">{new Date(r.window_start).toLocaleString("ar")}</td>
                  <td className="p-2 text-xs whitespace-nowrap">{new Date(r.updated_at).toLocaleString("ar")}</td>
                </tr>
              ))}
              {(throttleQ.data?.rows ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">لا حالات تحديد معدّل نشطة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DlqPanel />
    </div>
  );
}

function DlqPanel() {
  const listFn = useServerFn(listDlqEvents);
  const replayFn = useServerFn(replayDlqEvent);
  const bulkFn = useServerFn(bulkReplayDlq);
  const resolveFn = useServerFn(resolveDlqEvent);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"UNRESOLVED" | "RESOLVED" | "ALL">("UNRESOLVED");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const q = useQuery({
    queryKey: ["dlq_events", status],
    queryFn: () => listFn({ data: { status, limit: 100 } }),
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dlq_events"] });
    qc.invalidateQueries({ queryKey: ["agent_events"] });
    qc.invalidateQueries({ queryKey: ["agent_events_stats"] });
  };

  const onReplay = async (id: string) => {
    setBusy(id); setMsg(null);
    try { await replayFn({ data: { id } }); setMsg({ kind: "ok", text: `✓ أُعيد إرسال ${id.slice(0, 8)}` }); invalidate(); }
    catch (e: any) { setMsg({ kind: "err", text: `✗ ${e?.message ?? String(e)}` }); }
    finally { setBusy(null); }
  };

  const onResolve = async (id: string) => {
    setBusy(id); setMsg(null);
    try { await resolveFn({ data: { id } }); setMsg({ kind: "ok", text: `✓ أُغلق ${id.slice(0, 8)}` }); invalidate(); }
    catch (e: any) { setMsg({ kind: "err", text: `✗ ${e?.message ?? String(e)}` }); }
    finally { setBusy(null); }
  };

  const onBulk = async () => {
    setBusy("bulk"); setMsg(null);
    try {
      const r = await bulkFn({ data: { limit: 10 } });
      setMsg({ kind: "ok", text: `✓ أُعيدت ${r.replayed}، فشلت ${r.failed}` });
      invalidate();
    } catch (e: any) { setMsg({ kind: "err", text: `✗ ${e?.message ?? String(e)}` }); }
    finally { setBusy(null); }
  };

  const rows = q.data?.rows ?? [];

  return (
    <section className="rounded-xl border p-4 space-y-3">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">طابور الرسائل الميتة (DLQ)</h2>
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as never)}>
            <option value="UNRESOLVED">غير محلولة</option>
            <option value="RESOLVED">محلولة</option>
            <option value="ALL">الكل</option>
          </select>
          <button
            onClick={onBulk}
            disabled={busy === "bulk"}
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {busy === "bulk" ? "..." : "إعادة إرسال أول 10"}
          </button>
        </div>
      </header>

      {msg && (
        <div className={`text-sm rounded px-3 py-2 ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-destructive"}`}>{msg.text}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-right p-2">الحدث</th>
              <th className="text-right p-2">الكيان</th>
              <th className="text-right p-2">محاولات</th>
              <th className="text-right p-2">آخر خطأ</th>
              <th className="text-right p-2">فشل في</th>
              <th className="text-right p-2">الحالة</th>
              <th className="text-right p-2">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 font-mono text-xs">{r.event_name}</td>
                <td className="p-2 text-xs">{r.entity_type ?? "—"}<br /><span className="text-muted-foreground" dir="ltr">{r.entity_id ?? ""}</span></td>
                <td className="p-2 text-xs text-center">{r.retry_count}</td>
                <td className="p-2 text-xs max-w-[280px] truncate" title={r.last_error ?? ""}>{r.last_error ?? "—"}</td>
                <td className="p-2 text-xs whitespace-nowrap">{new Date(r.failed_at).toLocaleString("ar")}</td>
                <td className="p-2 text-xs">{r.resolved_at ? "✓ محلول" : "—"}</td>
                <td className="p-2 text-xs whitespace-nowrap">
                  {!r.resolved_at && (
                    <div className="flex gap-1">
                      <button onClick={() => onReplay(r.id)} disabled={busy === r.id} className="px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">إعادة</button>
                      <button onClick={() => onResolve(r.id)} disabled={busy === r.id} className="px-2 py-1 rounded border">إغلاق</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">لا عناصر في DLQ.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function Card({ title, value, tone = "neutral" }: { title: string; value: number | string; tone?: "ok" | "warn" | "neutral" }) {
  const toneCls = tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}
