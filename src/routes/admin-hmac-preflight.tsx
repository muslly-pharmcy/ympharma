import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runHmacPreflight, type HmacPreflightResult } from "@/lib/hmac-preflight.functions";
import { SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/admin-hmac-preflight")({
  head: () => ({
    meta: [
      { title: "فحص HMAC قبل الإرسال" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <Page />
    </AdminGate>
  ),
});

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs rounded border ${
        ok ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-red-50 text-red-800 border-red-300"
      }`}
    >
      {children}
    </span>
  );
}

function Page() {
  const run = useServerFn(runHmacPreflight);
  const [result, setResult] = useState<HmacPreflightResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function execute(probe: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const r = await run({ data: { probe } });
      setResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">فحص HMAC قبل الإرسال</h1>
          <p className="text-sm text-muted-foreground">
            يحسب التوقيع الذي سنرسله إلى n8n، ويختبر تطابقه مع verifier الـ inbound، ويعرض كل التنسيقات
            البديلة عند الفشل لتحديد سبب الاختلاف بدقة.
          </p>
        </header>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => execute(false)}
            disabled={busy}
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {busy ? "جارٍ الفحص…" : "تشغيل الفحص (Dry — بدون إرسال)"}
          </button>
          <button
            onClick={() => execute(true)}
            disabled={busy}
            className="px-4 py-2 rounded border text-sm disabled:opacity-50"
          >
            تشغيل + إرسال probe إلى n8n
          </button>
        </div>

        {err && (
          <div className="border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm">
            خطأ: {err}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <section className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">النتيجة الكلية</h2>
                <Badge ok={result.ok}>{result.ok ? "PASS" : "FAIL"}</Badge>
              </div>
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge ok={result.secret_present}>SECRET {result.secret_present ? "✓" : "✗"}</Badge>
                <Badge ok={result.webhook_url_present}>URL {result.webhook_url_present ? "✓" : "✗"}</Badge>
                <Badge ok={result.roundtrip.passes}>Roundtrip {result.roundtrip.passes ? "✓" : "✗"}</Badge>
              </div>
              <p className="text-sm">{result.roundtrip.reason}</p>
              <p className="text-xs text-muted-foreground">{result.expected_n8n_format}</p>
            </section>

            <section className="border rounded-lg p-4 space-y-2">
              <h2 className="font-semibold">الجسم المُسلسَل (canonical body)</h2>
              <div className="text-xs grid grid-cols-2 gap-2">
                <div>عدد البايتات: <strong>{result.body_bytes}</strong></div>
                <div>SHA-256(body): <code className="break-all">{result.body_sha256_hex}</code></div>
              </div>
              <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto" dir="ltr">
                {result.canonical_body}
              </pre>
            </section>

            {result.outbound && (
              <section className="border rounded-lg p-4 space-y-2">
                <h2 className="font-semibold">الرأس الذي نرسله</h2>
                <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto" dir="ltr">
                  {result.outbound.header_name}: {result.outbound.header_value}
                </pre>
              </section>
            )}

            <section className="border rounded-lg p-4 space-y-2">
              <h2 className="font-semibold">التنسيقات البديلة (للمقارنة مع n8n)</h2>
              <p className="text-xs text-muted-foreground">
                إذا كان n8n يرفض توقيعنا، اطلب من المسؤول مقارنة قيمة التوقيع لديه مع كل صف هنا. الصف
                المتطابق يكشف التنسيق المستخدم فعلياً في n8n.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-right">الوصف</th>
                      <th className="p-2 text-right">الخوارزمية</th>
                      <th className="p-2 text-right">الترميز</th>
                      <th className="p-2 text-right">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.variants.map((v) => (
                      <tr key={v.id} className="border-t align-top">
                        <td className="p-2">{v.label}</td>
                        <td className="p-2">{v.algorithm}</td>
                        <td className="p-2">{v.encoding}{v.prefixed ? " + prefix" : ""}</td>
                        <td className="p-2 font-mono break-all" dir="ltr">{v.header_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {result.probe && (
              <section className="border rounded-lg p-4 space-y-2">
                <h2 className="font-semibold">نتيجة الـ probe إلى n8n</h2>
                {result.probe.error ? (
                  <p className="text-sm text-red-700">خطأ: {result.probe.error}</p>
                ) : (
                  <>
                    <div className="text-xs">
                      الحالة: <Badge ok={(result.probe.status ?? 500) < 400}>{result.probe.status}</Badge>
                    </div>
                    <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto" dir="ltr">
                      {result.probe.body_preview || "(جسم فارغ)"}
                    </pre>
                  </>
                )}
              </section>
            )}

            {result.notes.length > 0 && (
              <section className="border rounded-lg p-4 space-y-1">
                <h2 className="font-semibold">ملاحظات</h2>
                <ul className="list-disc pr-5 text-sm space-y-1">
                  {result.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
