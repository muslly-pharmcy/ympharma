import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Stethoscope } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { DoctorCard } from "@/modules/doctors/components/DoctorCard";
import { DoctorFilters } from "@/modules/doctors/components/DoctorFilters";
import { EmptyState } from "@/modules/doctors/components/EmptyState";
import { searchDoctorsPublic, listPublicFacets } from "@/modules/doctors/api/doctors.functions";

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  specialty: z.string().catch("").default(""),
  city: z.string().catch("").default(""),
  facility: z.string().catch("").default(""),
  page: z.number().int().catch(1).default(1),
});
type SearchT = z.infer<typeof searchSchema>;

const facetsQO = queryOptions({
  queryKey: ["doctors", "facets"],
  queryFn: () => listPublicFacets(),
  staleTime: 5 * 60_000,
});

const doctorsQO = (filters: z.infer<typeof searchSchema>) =>
  queryOptions({
    queryKey: ["doctors", "search", filters],
    queryFn: () => searchDoctorsPublic({ data: filters }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/doctors")({
  validateSearch: (s: Record<string, unknown>): SearchT => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(facetsQO),
      context.queryClient.ensureQueryData(doctorsQO(deps)),
    ]);
  },
  component: DoctorsPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-6 text-center" dir="rtl">
      <p className="text-sm text-destructive">تعذّر تحميل قائمة الأطباء: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-6" dir="rtl">لا يوجد.</div>,
  head: () => ({
    meta: [
      { title: "دليل الأطباء — صيدلية المصلي" },
      { name: "description", content: "ابحث عن الأطباء في عدن وباقي المحافظات حسب التخصص، المدينة، والمركز الصحي." },
      { property: "og:title", content: "دليل الأطباء — صيدلية المصلي" },
      { property: "og:description", content: "شبكة موثّقة من الأطباء المتخصصين مع درجات ثقة واضحة وقنوات تواصل مباشرة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function DoctorsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/doctors" });
  const { data: facets } = useSuspenseQuery(facetsQO);
  const { data: result } = useSuspenseQuery(doctorsQO(search));

  const onChange = (patch: Partial<SearchT>) =>
    navigate({ search: (prev: SearchT) => ({ ...prev, ...patch, page: 1 }) });

  return (
    <>
      <SiteHeader />
      <main dir="rtl" className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-4 flex items-center gap-2">
          <Stethoscope className="size-5 text-primary-deep" />
          <h1 className="text-2xl font-black">دليل الأطباء</h1>
          <span className="ms-2 text-sm text-muted-foreground">({result.total} نتيجة)</span>
        </header>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <DoctorFilters
              value={search}
              onChange={onChange}
              specialties={facets.specialties.map((s) => ({ code: s.code, name_ar: s.name_ar }))}
              cities={facets.cities}
              facilities={facets.facilities}
            />
            <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              درجات الثقة (A–D) تعكس مصدر التحقق. أبلغنا عن أي بيانات غير دقيقة.
            </p>
          </aside>

          <section>
            {result.doctors.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {result.doctors.map((d) => (
                  <li key={d.id}><DoctorCard d={d} /></li>
                ))}
              </ul>
            )}
            {result.total > result.perPage && (
              <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
                <button
                  disabled={search.page <= 1}
                  onClick={() => onChange({ page: search.page - 1 })}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 font-bold disabled:opacity-40"
                >السابق</button>
                <span className="text-muted-foreground">صفحة {search.page} من {Math.ceil(result.total / result.perPage)}</span>
                <button
                  disabled={search.page * result.perPage >= result.total}
                  onClick={() => onChange({ page: search.page + 1 })}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 font-bold disabled:opacity-40"
                >التالي</button>
              </nav>
            )}
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-bold">هل أنت طبيب وتود الانضمام؟</p>
          <p className="mt-1 text-muted-foreground">أرسل بياناتك عبر <Link to="/contact" className="text-primary-deep underline">صفحة التواصل</Link> ليتم توثيقك وإضافتك للدليل.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
