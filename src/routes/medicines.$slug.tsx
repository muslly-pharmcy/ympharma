import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Pill, AlertTriangle, Info, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";

type Medicine = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  atc_code: string | null;
  synonyms: string[] | null;
  metadata: Record<string, unknown> | null;
};

export const Route = createFileRoute("/medicines/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${decodeURIComponent(params.slug)} — دليل الأدوية MUSLLY` },
      { name: "description", content: `معلومات طبية عن ${decodeURIComponent(params.slug)}: الاستخدامات، الاحتياطات، والتفاعلات الدوائية.` },
      { property: "og:title", content: `${decodeURIComponent(params.slug)} — MUSLLY` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `https://muslly.com/medicines/${params.slug}` }],
  }),
  component: MedicinePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background p-8 text-center">
      <p className="text-sm text-rose-600">تعذر تحميل معلومات الدواء: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background p-8 text-center">
      <p className="text-sm text-muted-foreground">لم يتم العثور على هذا الدواء.</p>
      <Link to="/medicines" className="mt-4 inline-block text-primary underline">العودة لدليل الأدوية</Link>
    </div>
  ),
});

function MedicinePage() {
  const { slug } = Route.useParams();

  const { data: medicine, isLoading } = useQuery({
    queryKey: ["medicine", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_entities")
        .select("id, slug, name_ar, name_en, description_ar, description_en, atc_code, synonyms, metadata")
        .eq("entity_type", "MEDICINE")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Medicine;
    },
  });

  const { data: interactions } = useQuery({
    queryKey: ["medicine-interactions", medicine?.id],
    enabled: !!medicine?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drug_interactions")
        .select("id, drug_a_id, drug_b_id, severity, effect_ar, recommendation_ar")
        .or(`drug_a_id.eq.${medicine!.id},drug_b_id.eq.${medicine!.id}`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || !medicine) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <ChevronRight className="size-3 rotate-180" />
          <Link to="/medicines" className="hover:text-foreground">الأدوية</Link>
          <ChevronRight className="size-3 rotate-180" />
          <span className="text-foreground">{medicine.name_ar}</span>
        </nav>

        <header className="mb-6 flex items-start gap-4 rounded-3xl border border-border bg-card p-6">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Pill className="size-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black">{medicine.name_ar}</h1>
            {medicine.name_en && <p className="text-sm text-muted-foreground">{medicine.name_en}</p>}
            {medicine.atc_code && (
              <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-mono">
                ATC: {medicine.atc_code}
              </span>
            )}
          </div>
        </header>

        {medicine.description_ar && (
          <section className="mb-6 rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Info className="size-4 text-primary" />
              <h2 className="text-lg font-bold">نبذة</h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{medicine.description_ar}</p>
          </section>
        )}

        {medicine.synonyms && medicine.synonyms.length > 0 && (
          <section className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-bold">أسماء أخرى</h2>
            <div className="flex flex-wrap gap-2">
              {medicine.synonyms.map((s) => (
                <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs">{s}</span>
              ))}
            </div>
          </section>
        )}

        {interactions && interactions.length > 0 && (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <h2 className="text-lg font-bold">تفاعلات دوائية</h2>
            </div>
            <ul className="space-y-3">
              {interactions.map((i) => (
                <li key={i.id} className="rounded-xl border border-amber-200 bg-background p-3 text-sm dark:border-amber-900">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      i.severity === "MAJOR" ? "bg-rose-100 text-rose-700" :
                      i.severity === "MODERATE" ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>
                      {i.severity}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{i.effect_ar}</p>
                  {i.recommendation_ar && (
                    <p className="mt-1 text-xs font-medium">توصية: {i.recommendation_ar}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
          هذه المعلومات لأغراض تعليمية فقط ولا تُغني عن استشارة طبيب أو صيدلي مرخّص.
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
