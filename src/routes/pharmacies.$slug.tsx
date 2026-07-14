import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Phone, Clock, Store } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  pnGetPharmacyPublic,
  pnListPharmacyProducts,
} from "@/modules/pharmacy-network/functions/pharmacies.functions";

const detailQO = (slug: string) =>
  queryOptions({
    queryKey: ["pn", "pharmacy", slug],
    queryFn: async () => {
      const json = await pnGetPharmacyPublic({ data: { slug } });
      if (!json) return null;
      return JSON.parse(json) as {
        pharmacy: {
          id: string; slug: string; name_ar: string; name_en: string | null;
          city: string | null; district: string | null; address: string | null;
          phone: string | null; whatsapp: string | null; is_24_7: boolean;
          bio_ar: string | null; logo_url: string | null; cover_url: string | null;
        };
        hours: Array<{ weekday: number; open_time: string | null; close_time: string | null; is_closed: boolean }>;
        product_count: number;
      };
    },
    staleTime: 60_000,
  });

const productsQO = (slug: string) =>
  queryOptions({
    queryKey: ["pn", "pharmacy", slug, "products"],
    queryFn: () => pnListPharmacyProducts({ data: { slug, q: "", limit: 100, offset: 0 } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/pharmacies/$slug")({
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(detailQO(params.slug));
    if (!detail) throw notFound();
    await context.queryClient.ensureQueryData(productsQO(params.slug));
  },
  component: PharmacyProfile,
  notFoundComponent: () => (
    <div dir="rtl" className="mx-auto max-w-2xl p-6 text-center text-sm">
      الصيدلية غير موجودة أو غير موثّقة بعد.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div dir="rtl" className="mx-auto max-w-2xl p-6 text-center text-sm text-destructive">
      خطأ: {error.message}
    </div>
  ),
  head: ({ loaderData: _l, params }) => ({
    meta: [
      { title: `صيدلية — ${params.slug}` },
      { name: "description", content: "ملف صيدلية موثّق ضمن شبكة صيدليات اليمن." },
    ],
  }),
});

const WEEKDAY_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function PharmacyProfile() {
  const { slug } = Route.useParams();
  const { data: detail } = useSuspenseQuery(detailQO(slug));
  const { data: products } = useSuspenseQuery(productsQO(slug));

  if (!detail) return null;
  const p = detail.pharmacy;

  return (
    <>
      <SiteHeader />
      <main dir="rtl" className="mx-auto max-w-4xl px-4 py-6">
        <header className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Store className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black">{p.name_ar}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <MapPin className="me-1 inline size-4" />
                {[p.city, p.district, p.address].filter(Boolean).join(" — ") || "—"}
              </p>
              {p.is_24_7 && (
                <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  24/7
                </span>
              )}
            </div>
          </div>
          {p.bio_ar && <p className="mt-3 text-sm text-muted-foreground">{p.bio_ar}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {p.phone && (
              <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-bold">
                <Phone className="size-4" /> {p.phone}
              </a>
            )}
            {p.whatsapp && (
              <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold">
                واتساب
              </a>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-black">
              <Clock className="size-4" /> ساعات العمل
            </h2>
            <ul className="space-y-1 text-sm">
              {detail.hours.map((h) => (
                <li key={h.weekday} className="flex justify-between">
                  <span>{WEEKDAY_AR[h.weekday]}</span>
                  <span className="text-muted-foreground">
                    {h.is_closed ? "مغلق" : `${h.open_time?.slice(0, 5)} – ${h.close_time?.slice(0, 5)}`}
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-black">الأدوية المتوفرة ({detail.product_count})</h2>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد أدوية معلن عنها حتى الآن.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {products.map((r) => (
                  <li key={r.catalog_product_id} className="flex items-center justify-between rounded-xl border border-border/60 p-2">
                    <span className="truncate text-sm">{r.product_name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${r.availability === "in_stock" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                      {r.availability === "in_stock" ? "متوفر" : "قليل"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
