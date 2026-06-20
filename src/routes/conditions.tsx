import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";

type Row = { condition: string; product_count: number; chronic_count: number; sample_image: string | null };

export const Route = createFileRoute("/conditions")({
  head: () => ({
    meta: [
      { title: "تسوّق حسب الحالة المرضية — صيدلية المصلي" },
      { name: "description", content: "اعثر على الأدوية والمنتجات المناسبة لحالتك: سكري، ضغط، حساسية، ربو، آلام وأكثر." },
      { property: "og:title", content: "تسوّق حسب الحالة المرضية — صيدلية المصلي" },
      { property: "og:url", content: "https://muslly.com/conditions" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/conditions" }],
  }),
  component: ConditionsIndex,
});

function ConditionsIndex() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc("conditions_catalog");
      if (cancel) return;
      if (error) setErr(error.message);
      else setRows((data ?? []) as Row[]);
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Stethoscope className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">تسوّق حسب الحالة</h1>
              <p className="text-xs text-white/85">المنتجات المناسبة لحالتك مصنّفة من قِبَل صيادلتنا</p>
            </div>
          </div>
        </header>

        {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        {!rows && !err && <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد حالات مصنّفة بعد.</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows?.map((r) => (
            <Link
              key={r.condition}
              to="/conditions/$slug"
              params={{ slug: encodeURIComponent(r.condition) }}
              className="group rounded-2xl border border-border bg-card p-3 transition hover:border-primary hover:shadow-md"
            >
              <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-secondary/40">
                {r.sample_image ? (
                  <img src={r.sample_image} alt={r.condition} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground"><Stethoscope className="size-8" /></div>
                )}
              </div>
              <div className="text-sm font-bold leading-tight">{r.condition}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{r.product_count} منتج</span>
                {r.chronic_count > 0 && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">مزمن {r.chronic_count}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
