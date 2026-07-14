import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronRight, MapPin, Stethoscope, GraduationCap } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { TrustBadge } from "@/modules/doctors/components/TrustBadge";
import { ScheduleTable } from "@/modules/doctors/components/ScheduleTable";
import { AppointmentCTA } from "@/modules/doctors/components/AppointmentCTA";
import { getDoctorBySlugPublic } from "@/modules/doctors/api/doctors.functions";

const doctorQO = (slug: string) =>
  queryOptions({
    queryKey: ["doctors", "profile", slug],
    queryFn: () => getDoctorBySlugPublic({ data: { slug } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/doctors/$slug")({
  params: { parse: (p) => ({ slug: z.string().min(1).parse(p.slug) }), stringify: (p) => ({ slug: p.slug }) },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(doctorQO(params.slug));
    if (!data) throw notFound();
    return data;
  },
  component: DoctorProfilePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-6 text-center" dir="rtl">
      <p className="text-sm text-destructive">تعذّر تحميل الملف: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center" dir="rtl">
      <p className="font-black">هذا الطبيب غير موجود</p>
      <Link to="/doctors" className="mt-3 inline-block text-sm text-primary-deep underline">العودة لدليل الأطباء</Link>
    </div>
  ),
  head: ({ loaderData }) => {
    const d = loaderData;
    const name = d ? `${d.title ? d.title + " " : "د. "}${d.full_name_ar}` : "طبيب";
    const spec = d?.specialties?.[0]?.name_ar ?? "";
    const desc = d ? `${name}${spec ? " — " + spec : ""}. احجز موعدك أو تواصل مباشرة عبر دليل صيدلية المصلي.` : "";
    const meta: Array<Record<string, string>> = [
      { title: `${name} — دليل الأطباء` },
      { name: "description", content: desc },
      { property: "og:title", content: name },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (d?.photo_url) {
      meta.push({ property: "og:image", content: d.photo_url });
      meta.push({ name: "twitter:image", content: d.photo_url });
    }
    return { meta };
  },
});

function DoctorProfilePage() {
  const d = Route.useLoaderData();
  const router = useRouter();
  const name = `${d.title ? d.title + " " : "د. "}${d.full_name_ar}`;
  const primaryLoc = d.locations[0];

  return (
    <>
      <SiteHeader />
      <main dir="rtl" className="mx-auto max-w-5xl px-4 py-6">
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">الرئيسية</Link>
          <ChevronRight className="size-3 rotate-180" />
          <Link to="/doctors" className="hover:underline">الأطباء</Link>
          <ChevronRight className="size-3 rotate-180" />
          <span className="truncate">{d.full_name_ar}</span>
        </nav>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            <div className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
                {d.photo_url ? (
                  <img src={d.photo_url} alt={name} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground"><Stethoscope className="size-8" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black">{name}</h1>
                  <TrustBadge level={d.trust_level} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {d.specialties.map((s: any) => (
                    <span key={s.id} className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.is_primary ? "bg-primary/10 text-primary-deep" : "bg-muted text-muted-foreground"}`}>{s.name_ar}</span>
                  ))}
                </div>
                {d.years_experience != null && d.years_experience > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">خبرة {d.years_experience} سنة</p>
                )}
                {d.languages && d.languages.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">اللغات: {d.languages.join("، ")}</p>
                )}
              </div>
            </div>

            {d.bio_ar && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-black">نبذة</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{d.bio_ar}</p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-black">مواعيد العمل</h2>
              <ScheduleTable slots={d.availability} locations={d.locations.map((l: any) => ({ id: l.id, name_ar: l.name_ar }))} />
            </div>

            {d.qualifications.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-1 text-sm font-black"><GraduationCap className="size-4" /> المؤهلات</h2>
                <ul className="space-y-1.5 text-sm">
                  {d.qualifications.map((q: any) => (
                    <li key={q.id} className="flex items-baseline gap-2">
                      <span className="font-bold">{q.title}</span>
                      {q.institution && <span className="text-muted-foreground">— {q.institution}</span>}
                      {q.year && <span className="text-xs text-muted-foreground">({q.year})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-black">حجز موعد</h2>
              <AppointmentCTA
                doctorName={name}
                phone={primaryLoc?.phone}
                whatsapp={primaryLoc?.whatsapp}
              />
            </div>
            {d.locations.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-1 text-sm font-black"><MapPin className="size-4" /> المواقع</h2>
                <ul className="space-y-3 text-sm">
                  {d.locations.map((l: any) => (
                    <li key={l.id} className="border-b border-border pb-2 last:border-none last:pb-0">
                      <p className="font-bold">{l.name_ar}</p>
                      {l.address && <p className="text-xs text-muted-foreground">{l.address}</p>}
                      {(l.city || l.governorate) && (
                        <p className="text-xs text-muted-foreground">{[l.city, l.governorate].filter(Boolean).join(" — ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => router.invalidate()} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted">
              تحديث البيانات
            </button>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
