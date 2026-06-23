// Admin dashboard for AI-generated social posts.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listSocialPosts,
  regenerateDailyPostsNow,
  publishPostNow,
  deleteSocialPost,
} from "@/lib/social.functions";

export const Route = createFileRoute("/admin-social-posts")({
  head: () => ({
    meta: [
      { title: "المنشورات اليومية — لوحة التحكم" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminGate>
      <AdminSocialPostsPage />
    </AdminGate>
  ),
});

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "📘 فيسبوك",
  instagram: "📸 إنستغرام",
  twitter: "🐦 تويتر",
  telegram: "✈️ تيليجرام",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "published") return <Badge className="bg-emerald-600">✅ منشور</Badge>;
  if (status === "pending") return <Badge variant="secondary">⏳ معلّق</Badge>;
  if (status === "failed") return <Badge variant="destructive">❌ فشل</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function AdminSocialPostsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSocialPosts);
  const regenFn = useServerFn(regenerateDailyPostsNow);
  const publishFn = useServerFn(publishPostNow);
  const deleteFn = useServerFn(deleteSocialPost);

  const posts = useQuery({
    queryKey: ["admin-social-posts"],
    queryFn: () => listFn({ data: { limit: 50 } }),
  });

  const regen = useMutation({
    mutationFn: () => regenFn(),
    onSuccess: (r: any) => {
      toast.success(`تم توليد ${r?.inserted ?? 0} منشور`);
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التوليد"),
  });

  const publish = useMutation({
    mutationFn: (id: string) => publishFn({ data: { id } }),
    onSuccess: (r: any) => {
      if (r?.ok) toast.success("تم النشر");
      else toast.error(r?.error ?? "فشل النشر");
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل النشر"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحذف"),
  });

  return (
    <div dir="rtl" className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📢 المنشورات اليومية</h1>
          <p className="text-sm text-muted-foreground">
            تُولَّد تلقائياً يومياً 8 صباحاً وتُرسَل إلى n8n للنشر.
          </p>
        </div>
        <Button onClick={() => regen.mutate()} disabled={regen.isPending}>
          {regen.isPending ? (
            <Loader2 className="size-4 ms-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 ms-2" />
          )}
          توليد الآن
        </Button>
      </div>

      {posts.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : posts.isError ? (
        <Card>
          <CardContent className="p-6 text-destructive">
            تعذّر التحميل: {(posts.error as Error)?.message}
          </CardContent>
        </Card>
      ) : (posts.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            لا توجد منشورات بعد. اضغط "توليد الآن" لإنشاء أول دفعة.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(posts.data ?? []).map((post: any) => (
            <Card key={post.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{PLATFORM_LABEL[post.platform] ?? post.platform}</Badge>
                  <StatusBadge status={post.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleString("ar")}
                  </span>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed">{post.caption}</p>

                {post.hashtags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {post.cta ? (
                  <p className="text-xs text-muted-foreground">💡 {post.cta}</p>
                ) : null}

                {post.error_message ? (
                  <p className="text-xs text-destructive">{post.error_message}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-2">
                  {post.status !== "published" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => publish.mutate(post.id)}
                      disabled={publish.isPending}
                    >
                      <Send className="size-3.5 ms-1.5" />
                      {post.status === "failed" ? "إعادة المحاولة" : "نشر الآن"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("حذف هذا المنشور؟")) remove.mutate(post.id);
                    }}
                  >
                    <Trash2 className="size-3.5 ms-1.5" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
