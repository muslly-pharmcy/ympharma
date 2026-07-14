import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { MapPin, Phone, Store, Search, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { pnSearchMedicineNearby } from "@/modules/pharmacy-network/server/pharmacies.functions";
import type { PnSearchHit } from "@/modules/pharmacy-network/domain/types";

const searchSchema = z.object({
  q: z.string().catch("").default(""),
});

export const Route = createFileRoute("/pharmacies")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  component: PharmaciesPage,
  head: () => ({
    meta: [
      { title: "شبكة الصيدليات — ابحث عن الأدوية بالقرب منك" },
      { name: "description", content: "دليل الصيدليات في اليمن مع بحث ذكي عن الأدوية المتوفرة وأقرب صيدلية إليك." },
      { property: "og:title", content: "شبكة صيدليات اليمن" },
      { property: "og:description", content: "ابحث عن دواء وشاهد أقرب صيدلية موثّقة تحتويه." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function PharmaciesPage() {
  const { q: qInit } = Route.useSearch();
  const navigate = useNavigate({ from: "/pharmacies" });
  const [q, setQ] = useState(qInit);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const searchFn = useServerFn(pnSearchMedicineNearby);

  const mutation = useMutation({
    mutationFn: (input: { q: string; lat: number | null; lng: number | null }) =>
      searchFn({ data: { q: input.q, lat: input.lat, lng: input.lng, radius_km: 25, limit: 50 } }),
  });

  const runSearch = (nextQ = q) => {
    navigate({ search: { q: nextQ } });
    mutation.mutate({ q: nextQ, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { setGeoErr("متصفحك لا يدعم تحديد الموقع"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoErr(null); },
      () => setGeoErr("تعذّر تحديد موقعك — سيتم البحث بدون المسافة"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const hits = (mutation.data ?? []) as PnSearchHit[];

  return (
    <>
      <SiteHeader />
      <main dir="rtl" className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Store className="size-6 text-primary" /> شبكة الصيدليات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ابحث عن دواء وشاهد أقرب صيدلية موثّقة تحتويه.
          </p>
        </header>

        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(); }}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="اسم الدواء (مثل: بارسيتامول، أموكسيسيلين...)"
              className="w-full rounded-xl border border-input bg-background py-2 pe-9 ps-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-xl border border-border bg-muted px-3 py-2 text-sm font-bold"
          >
            <MapPin className="me-1 inline size-4" />
            {coords ? "موقعي محدَّد" : "استخدم موقعي"}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="inline size-4 animate-spin" /> : "بحث"}
          </button>
        </form>

        {geoErr && <p className="mt-2 text-xs text-destructive">{geoErr}</p>}

        <section className="mt-6">
          {mutation.isIdle && (
            <p className="text-sm text-muted-foreground">ابدأ بكتابة اسم دواء للبحث.</p>
          )}
          {mutation.isSuccess && hits.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-sm">
              لا توجد نتائج. جرّب اسمًا آخر أو وسّع نطاق البحث.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {hits.map((h) => (
              <li key={`${h.pharmacy_id}-${h.catalog_product_id}`}>
                <article className="rounded-2xl border border-border bg-card p-4">
                  <header className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to="/pharmacies/$slug"
                        params={{ slug: h.pharmacy_slug }}
                        className="text-base font-black hover:underline"
                      >
                        {h.pharmacy_name_ar}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[h.city, h.district].filter(Boolean).join(" — ") || "—"}
                      </p>
                    </div>
                    {typeof h.distance_km === "number" && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        {h.distance_km.toFixed(1)} كم
                      </span>
                    )}
                  </header>
                  <p className="mt-2 text-sm">
                    <span className="font-bold">{h.product_name}</span>
                    <span className={`ms-2 rounded-full px-2 py-0.5 text-xs ${h.availability === "in_stock" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                      {h.availability === "in_stock" ? "متوفر" : "قليل"}
                    </span>
                  </p>
                  <footer className="mt-3 flex gap-2 text-xs">
                    {h.phone && (
                      <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 font-bold">
                        <Phone className="size-3" /> اتصال
                      </a>
                    )}
                    {h.whatsapp && (
                      <a href={`https://wa.me/${h.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border px-2 py-1 font-bold">
                        واتساب
                      </a>
                    )}
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          البيانات المعروضة تخصّ الصيدليات الموثّقة فقط. للتسجيل كصيدلية شريكة، تواصل معنا.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
