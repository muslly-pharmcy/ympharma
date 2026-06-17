import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Database, HardDrive, ShieldCheck, Radio, RefreshCw } from "lucide-react";
import { SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/admin-diagnostics")({
  head: () => ({
    meta: [
      { title: "تشخيص النظام — لوحة التحكم" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DiagnosticsPage,
});

type Status = "idle" | "checking" | "ok" | "fail";
type Check = { key: string; label: string; icon: typeof Database; status: Status; detail?: string };

function DiagnosticsPage() {
  const [checks, setChecks] = useState<Check[]>([
    { key: "auth", label: "المصادقة (Auth)", icon: ShieldCheck, status: "idle" },
    { key: "db", label: "قاعدة البيانات (Database)", icon: Database, status: "idle" },
    { key: "storage", label: "التخزين (Storage)", icon: HardDrive, status: "idle" },
    { key: "realtime", label: "التحديثات الفورية (Realtime)", icon: Radio, status: "idle" },
  ]);
  const [running, setRunning] = useState(false);

  function update(key: string, status: Status, detail?: string) {
    setChecks((cur) => cur.map((c) => (c.key === key ? { ...c, status, detail } : c)));
  }

  async function runAll() {
    setRunning(true);
    setChecks((cur) => cur.map((c) => ({ ...c, status: "checking", detail: undefined })));

    // Auth
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) update("auth", "fail", error?.message || "لا يوجد مستخدم مسجّل");
      else update("auth", "ok", data.user.email ?? data.user.id);
    } catch (e: any) { update("auth", "fail", String(e?.message ?? e)); }

    // Database
    try {
      const { error } = await supabase.from("orders").select("id", { count: "exact", head: true }).limit(1);
      if (error) update("db", "fail", error.message);
      else update("db", "ok", "الاتصال يعمل");
    } catch (e: any) { update("db", "fail", String(e?.message ?? e)); }

    // Storage
    try {
      const { data, error } = await supabase.storage.from("prescriptions").list("", { limit: 1 });
      if (error) update("storage", "fail", error.message);
      else update("storage", "ok", `bucket: prescriptions (${data?.length ?? 0} عنصر)`);
    } catch (e: any) { update("storage", "fail", String(e?.message ?? e)); }

    // Realtime
    await new Promise<void>((resolve) => {
      const channel = supabase.channel("diag-" + Date.now());
      const timer = setTimeout(() => {
        update("realtime", "fail", "انتهت المهلة بدون استجابة");
        supabase.removeChannel(channel);
        resolve();
      }, 6000);
      channel.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          clearTimeout(timer);
          update("realtime", "ok", "الاشتراك يعمل");
          supabase.removeChannel(channel);
          resolve();
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          clearTimeout(timer);
          update("realtime", "fail", s);
          supabase.removeChannel(channel);
          resolve();
        }
      });
    });

    setRunning(false);
  }

  useEffect(() => { runAll(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-black">تشخيص النظام</h1>
            <p className="text-xs text-muted-foreground">فحص حالة Auth / Database / Storage / Realtime</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin" className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">← العودة</a>
            <button onClick={runAll} disabled={running} className="brand-gradient flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-60">
              {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              إعادة الفحص
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 py-6">
        {checks.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={`grid size-11 place-items-center rounded-xl ${c.status === "ok" ? "bg-emerald-100 text-emerald-700" : c.status === "fail" ? "bg-rose-100 text-rose-700" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-black">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.detail ?? (c.status === "checking" ? "جارٍ الفحص..." : "—")}</p>
                </div>
              </div>
              <div>
                {c.status === "checking" && <Loader2 className="size-5 animate-spin text-primary" />}
                {c.status === "ok" && <CheckCircle2 className="size-6 text-emerald-600" />}
                {c.status === "fail" && <XCircle className="size-6 text-rose-600" />}
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
          ملاحظة: هذه الصفحة تستخدم جلسة المستخدم الحالي وتطبّق سياسات RLS. إذا ظهر خطأ في قاعدة البيانات قد يكون السبب نقص الصلاحيات لحسابك.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
