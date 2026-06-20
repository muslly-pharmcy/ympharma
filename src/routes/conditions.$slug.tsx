import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2, Pill } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  legacy_id: number; name: string; brand: string | null; price: number;
  old_price: number | null; image_url: string | null; category: string | null;
  badge: string | null; is_chronic: boolean | null;
  active_ingredient: string | null; therapeutic_category: string | null;
};

export const Route = createFileRoute("/conditions/$slug")({
  head: ({ params }) => {
    const cond = decodeURIComponent(params.slug);
    return {
      meta: [
        { title: `${cond} — منتجات صيدلية المصلي` },
        { name: "description", content: `أدوية ومنتجات لـ ${cond} متوفرة في صيدلية المصلي مع توصيل سريع.` },
        { property: "og:title", content: `${cond} — صيدلية المصلي` },
        { property: "og:url", content: `https://muslly.com/conditions/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `https://muslly.com/conditions/${params.slug}` }],
    };
  },
  component: ConditionPage,
});

function ConditionPage() {
  const { slug } = Route.useParams();
  const condition = decodeURIComponent(slug);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("products_by_condition", { _condition: condition });
      if (cancel) return;
      if (error) setErr(error.message);
      else setRows((data ?? []) as Row[]);
    })();
    return () => { cancel = true; };
  }, [condition]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <ChevronRight className="size-3 rotate-180" />
          <Link to="/conditions" className="hover:text-foreground">الحالات</Link>
          <ChevronRight className="size-3 rotate-180" />
          <span className="text-foreground">{condition}</span>
        </nav>

        <h1 className="mb-1 text-2xl font-black">{condition}</h1>
        <p className="mb-4 text-sm text-muted-foreground">منتجات مختارة من فريق صيدلية المصلي لهذه الحالة.</p>

        {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        {!rows && !err && <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد منتجات منشورة لهذه الحالة بعد.</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows?.map((p) => (
            <Link
              key={p.legacy_id}
              to="/product/$id"
              params={{ id: String(p.legacy_id) }}
              className="group rounded-2xl border border-border bg-card p-2.5 transition hover:border-primary hover:shadow-md"
            >
              <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-secondary/40">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground"><Pill className="size-8" /></div>
                )}
              </div>
              <div className="line-clamp-2 text-xs font-bold leading-tight">{p.name}</div>
              {p.active_ingredient && (
                <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{p.active_ingredient}</div>
              )}
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-extrabold text-primary">{Math.round(Number(p.price)).toLocaleString("ar-EG")}</span>
                <span className="text-[10px] text-muted-foreground">ر.ي</span>
                {p.is_chronic && (
                  <span className="ms-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">مزمن</span>
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
