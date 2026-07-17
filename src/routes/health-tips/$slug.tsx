import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { getPostBySlug } from "@/lib/medical-posts.functions";

const postQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-medical-post", slug],
    queryFn: () => getPostBySlug({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/health-tips/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(postQuery(params.slug));
    if (!res.post) throw notFound();
  },
  head: ({ loaderData: _l, params }) => ({
    meta: [
      { title: `${params.slug} — نصائح صحية المصلي` },
      { name: "description", content: "مقالة صحية موثوقة من فريق صيدلية المصلي." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: PostPage,
  errorComponent: ({ error, reset }) => {
    const qc = useQueryClient();
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-950 text-teal-100 p-6">
        <div className="max-w-md text-center">
          <p className="mb-4">تعذر تحميل المقالة.</p>
          <p className="text-xs text-teal-400 mb-4">{error instanceof Error ? error.message : ""}</p>
          <button
            onClick={() => { qc.invalidateQueries(); reset(); }}
            className="rounded-lg bg-teal-500 px-4 py-2 text-slate-900"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-950 text-teal-100">
      <div className="text-center">
        <p className="mb-3">المقالة غير موجودة أو غير منشورة.</p>
        <Link to="/health-tips" className="text-teal-400 hover:underline">← العودة إلى النصائح</Link>
      </div>
    </div>
  ),
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(postQuery(slug));
  const post = data.post!;
  const bodyHtml = post.content
    .split(/\n{2,}/)
    .map((block: string) => {
      if (block.startsWith("## ")) return `<h2 class="mt-6 mb-2 text-xl font-bold text-teal-200">${escape(block.slice(3))}</h2>`;
      if (block.startsWith("# ")) return `<h1 class="mt-6 mb-2 text-2xl font-bold text-teal-100">${escape(block.slice(2))}</h1>`;
      if (block.startsWith("- ")) {
        const items = block.split(/\n/).map((l: string) => `<li>${escape(l.replace(/^-\s*/, ""))}</li>`).join("");
        return `<ul class="list-disc pr-6 space-y-1 my-2">${items}</ul>`;
      }
      return `<p class="my-3 leading-relaxed text-teal-100/90">${escape(block)}</p>`;
    })
    .join("");

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-teal-100">
      <article className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/health-tips" className="text-xs text-teal-400 hover:underline">
          ← جميع النصائح
        </Link>
        <div className="mt-4 text-xs text-teal-500">{post.category}</div>
        <h1 className="mt-1 text-3xl font-bold text-teal-100">{post.title}</h1>
        {post.summary && <p className="mt-3 text-teal-300">{post.summary}</p>}
        <div className="prose prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <div className="mt-8 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-xs text-amber-200">
          ⚠️ هذه المعلومات للتوعية فقط ولا تُغني عن استشارة الطبيب أو الصيدلي.
        </div>
      </article>
    </div>
  );
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
