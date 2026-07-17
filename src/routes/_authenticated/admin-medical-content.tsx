import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListPosts,
  adminApprovePost,
  adminGetPost,
  adminUpdatePost,
} from "@/lib/medical-posts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin-medical-content")({
  head: () => ({
    meta: [
      { title: "المحتوى الطبي — المصلي" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <MedicalContentPage />
    </AdminGate>
  ),
});

type PostRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  approved: boolean;
  publish_date: string | null;
  ai_generated: boolean;
  created_at: string;
};

function MedicalContentPage() {
  const list = useServerFn(adminListPosts);
  const approve = useServerFn(adminApprovePost);
  const getPost = useServerFn(adminGetPost);
  const update = useServerFn(adminUpdatePost);
  const [rows, setRows] = useState<PostRow[]>([]);
  const [editing, setEditing] = useState<{ id: string; title: string; summary: string; content: string } | null>(null);

  const refresh = useCallback(async () => {
    const r = await list({});
    setRows(r.posts as PostRow[]);
  }, [list]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 p-6 text-teal-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">المحتوى الطبي</h1>
          <Link to="/admin-hub" className="text-sm text-teal-400 hover:underline">
            ← لوحة الأدمن
          </Link>
        </div>

        <div className="rounded-xl border border-teal-900/60 bg-slate-900/60">
          <table className="w-full text-sm">
            <thead className="border-b border-teal-900/60 text-teal-300">
              <tr>
                <th className="p-3 text-right">العنوان</th>
                <th className="p-3">الفئة</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-teal-400">
                    لا يوجد محتوى بعد. يعمل مولّد المحتوى الذكي تلقائياً كل يوم.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-teal-900/40 align-top">
                  <td className="p-3 text-right">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-teal-500">{p.slug}</div>
                  </td>
                  <td className="p-3 text-center">{p.category}</td>
                  <td className="p-3 text-center text-xs text-teal-400">
                    {p.publish_date || p.created_at.slice(0, 10)}
                  </td>
                  <td className="p-3 text-center">
                    <span className={p.approved ? "text-emerald-400" : "text-amber-400"}>
                      {p.approved ? "منشور" : "بانتظار المراجعة"}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-2 space-x-reverse">
                    <button
                      onClick={async () => {
                        const r = await getPost({ data: { id: p.id } });
                        const post = r.post as { title: string; summary: string | null; content: string };
                        if (post) {
                          setEditing({
                            id: p.id,
                            title: post.title,
                            summary: post.summary ?? "",
                            content: post.content,
                          });
                        }
                      }}
                      className="rounded-md border border-teal-800 px-3 py-1 text-xs hover:bg-teal-950"
                    >
                      تحرير
                    </button>
                    <button
                      onClick={async () => {
                        await approve({ data: { postId: p.id, approve: !p.approved } });
                        toast.success(p.approved ? "تم الإلغاء" : "تم النشر");
                        refresh();
                      }}
                      className={`rounded-md px-3 py-1 text-xs ${p.approved ? "bg-slate-700 text-slate-100" : "bg-emerald-500 text-slate-900"}`}
                    >
                      {p.approved ? "إلغاء النشر" : "اعتماد ونشر"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-teal-900 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-bold">تحرير المقالة</h3>
              <div className="space-y-3">
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-lg border border-teal-900 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="العنوان"
                />
                <textarea
                  value={editing.summary}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-teal-900 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="الملخص"
                />
                <textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  rows={14}
                  className="w-full rounded-lg border border-teal-900 bg-slate-950 px-3 py-2 text-sm font-mono"
                  placeholder="المحتوى (Markdown)"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-teal-800 px-4 py-2 text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    try {
                      await update({
                        data: {
                          id: editing.id,
                          title: editing.title,
                          summary: editing.summary,
                          content: editing.content,
                        },
                      });
                      toast.success("تم الحفظ");
                      setEditing(null);
                      refresh();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "خطأ");
                    }
                  }}
                  className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
