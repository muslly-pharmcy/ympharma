import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { listApprovedPosts } from "@/lib/medical-posts.functions";

const postsQuery = queryOptions({
  queryKey: ["public-medical-posts"],
  queryFn: () => listApprovedPosts(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/health-tips/")({
  head: () => ({
    meta: [
      { title: "نصائح صحية موثوقة — المصلي" },
      { name: "description", content: "مقالات ونصائح صحية أسبوعية من فريق صيدلية المصلي في اليمن — سلامة الأدوية، القلب، التغذية، صحة الأسرة." },
      { property: "og:title", content: "نصائح صحية موثوقة — المصلي" },
      { property: "og:description", content: "محتوى طبي محدث بإشراف صيدلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(postsQuery);
  },
  component: HealthTipsIndex,
  errorComponent: ({ error, reset }) => {
    const qc = useQueryClient();
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-950 text-teal-100 p-6">
        <div className="max-w-md text-center">
          <p className="mb-4">حدث خطأ أثناء تحميل النصائح.</p>
          <p className="text-xs text-teal-400 mb-4">{error instanceof Error ? error.message : "خطأ غير معروف"}</p>
          <button
            onClick={() => { qc.invalidateQueries({ queryKey: ["public-medical-posts"] }); reset(); }}
            className="rounded-lg bg-teal-500 px-4 py-2 text-slate-900"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => <div dir="rtl" className="p-8 text-center text-teal-100">الصفحة غير موجودة</div>,
});

function HealthTipsIndex() {
  const { data } = useSuspenseQuery(postsQuery);
  const posts = data.posts;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-teal-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-teal-200">نصائح صحية موثوقة</h1>
          <p className="mt-2 text-sm text-teal-400">
            محتوى طبي محدث من فريق صيدلية المصلي — للتوعية فقط، وليس بديلاً عن استشارة الطبيب.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-teal-900/60 bg-slate-900/60 p-8 text-center text-teal-400">
            لا توجد مقالات منشورة بعد. تابعنا قريباً.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/health-tips/$slug"
                params={{ slug: p.slug }}
                className="block rounded-xl border border-teal-900/60 bg-slate-900/60 p-5 transition hover:border-teal-700 hover:bg-slate-900"
              >
                <div className="text-xs text-teal-500">{p.category}</div>
                <h2 className="mt-2 text-lg font-semibold text-teal-100">{p.title}</h2>
                {p.summary && <p className="mt-2 text-sm text-teal-300 line-clamp-3">{p.summary}</p>}
                <div className="mt-3 text-xs text-teal-500">
                  {(p.published_at || p.publish_date || "").slice(0, 10)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
