import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/admin-agent-insights")({
  head: () => ({
    meta: [
      { title: "رؤى وكيل الذكاء الاصطناعي" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <Page />
    </AdminGate>
  ),
});

interface CalibRow {
  id: number;
  computed_at: string;
  sample_size: number;
  correlation: number | null;
  drift: number | null;
  severity: string;
  notes: string | null;
}
interface InsightRow {
  id: number;
  computed_at: string;
  platform: string | null;
  sample_size: number;
  avg_engagement: number | null;
  top_variant_id: string | null;
  recommendations: Array<{ type: string; message: string }> | null;
}

function severityClass(s: string) {
  if (s === "critical") return "bg-red-100 text-red-800 border-red-300";
  if (s === "warning") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-emerald-100 text-emerald-800 border-emerald-300";
}

function Page() {
  const [calib, setCalib] = useState<CalibRow[]>([]);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, i] = await Promise.all([
        supabase
          .from("confidence_calibration_log")
          .select("id,computed_at,sample_size,correlation,drift,severity,notes")
          .order("computed_at", { ascending: false })
          .limit(20),
        supabase
          .from("agent_performance_insights")
          .select("id,computed_at,platform,sample_size,avg_engagement,top_variant_id,recommendations")
          .order("computed_at", { ascending: false })
          .limit(20),
      ]);
      setCalib((c.data ?? []) as CalibRow[]);
      setInsights((i.data ?? []) as InsightRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto p-6 space-y-8" dir="rtl">
        <header>
          <h1 className="text-2xl font-bold">رؤى وكيل الذكاء الاصطناعي</h1>
          <p className="text-muted-foreground text-sm">
            معايرة الثقة وتوصيات الأداء — للمراجعة اليدوية فقط (Human-in-the-loop).
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">معايرة الثقة (Confidence Calibration)</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
          ) : calib.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات معايرة بعد.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">التاريخ</th>
                    <th className="p-2">العينة</th>
                    <th className="p-2">Correlation</th>
                    <th className="p-2">Drift</th>
                    <th className="p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {calib.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{new Date(r.computed_at).toLocaleString("ar")}</td>
                      <td className="p-2 text-center">{r.sample_size}</td>
                      <td className="p-2 text-center">{r.correlation?.toFixed(3) ?? "—"}</td>
                      <td className="p-2 text-center">{r.drift?.toFixed(3) ?? "—"}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded border text-xs ${severityClass(r.severity)}`}>
                          {r.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">توصيات الأداء (Recommendations)</h2>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد رؤى بعد.</p>
          ) : (
            <ul className="space-y-3">
              {insights.map((r) => (
                <li key={r.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{r.platform ?? "كل المنصات"} · عينة {r.sample_size}</span>
                    <span>{new Date(r.computed_at).toLocaleString("ar")}</span>
                  </div>
                  <div className="text-sm">
                    متوسط التفاعل: <strong>{r.avg_engagement ?? 0}</strong>
                    {r.top_variant_id ? <> · أفضل نموذج: <strong>{r.top_variant_id}</strong></> : null}
                  </div>
                  {r.recommendations && r.recommendations.length > 0 && (
                    <ul className="list-disc pr-5 text-sm space-y-0.5">
                      {r.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec.message}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
