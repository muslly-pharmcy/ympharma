// Admin dashboard for AI-generated social posts.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Send,
  Trash2,
  Loader2,
  History,
  BarChart3,
  Heart,
  MessageCircle,
  Share2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  listSocialPosts,
  regenerateDailyPostsNow,
  publishPostNow,
  deleteSocialPost,
  listPostAttempts,
  getPostStats,
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

function AttemptsDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const attemptsFn = useServerFn(listPostAttempts);
  const statsFn = useServerFn(getPostStats);
  const attempts = useQuery({
    queryKey: ["social-post-attempts", postId],
    queryFn: () => attemptsFn({ data: { post_id: postId! } }),
    enabled: !!postId && open,
  });
  const stats = useQuery({
    queryKey: ["social-post-stats", postId],
    queryFn: () => statsFn({ data: { post_id: postId! } }),
    enabled: !!postId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>📜 سجل المحاولات والإحصائيات</DialogTitle>
        </DialogHeader>

        {stats.data ? (
          <div className="grid grid-cols-4 gap-2 rounded-lg border p-3 text-center text-sm">
            <div><Heart className="size-4 mx-auto text-rose-500" /><div>{stats.data.likes ?? 0}</div></div>
            <div><MessageCircle className="size-4 mx-auto text-sky-500" /><div>{stats.data.comments ?? 0}</div></div>
            <div><Share2 className="size-4 mx-auto text-emerald-500" /><div>{stats.data.shares ?? 0}</div></div>
            <div><Eye className="size-4 mx-auto text-violet-500" /><div>{stats.data.views ?? 0}</div></div>
          </div>
        ) : null}

        {attempts.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
        ) : (attempts.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد محاولات بعد.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {(attempts.data ?? []).map((a: any) => (
              <div key={a.id} className="rounded-md border p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "success" ? "default" : "destructive"}>
                    #{a.attempt_no} • {a.status === "success" ? "نجاح" : "فشل"}
                  </Badge>
                  <Badge variant="outline">{a.source}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("ar")}
                  </span>
                </div>
                {a.external_id ? <div>external_id: <code>{a.external_id}</code></div> : null}
                {a.error_message ? <div className="text-destructive">{a.error_message}</div> : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdminSocialPostsPage() {
  const qc = useQueryClient();
  const [attemptsForPost, setAttemptsForPost] = useState<string | null>(null);

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
      if (r?.ok) toast.success(`تم النشر (محاولة #${r.attempt_no ?? "?"})`);
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
            تُولَّد تلقائياً يومياً 8 صباحاً وتُرسَل إلى n8n للنشر، والإحصائيات تُجمَع كل ساعة.
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
                  {post.attempt_count > 0 && (
                    <Badge variant="secondary">محاولات: {post.attempt_count}</Badge>
                  )}
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
                      {post.status === "failed"
                        ? `إعادة المحاولة${post.attempt_count ? ` (#${post.attempt_count + 1})` : ""}`
                        : "نشر الآن"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAttemptsForPost(post.id)}
                  >
                    <History className="size-3.5 ms-1.5" />
                    السجل
                  </Button>
                  {post.status === "published" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAttemptsForPost(post.id)}
                    >
                      <BarChart3 className="size-3.5 ms-1.5" />
                      الإحصائيات
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

      <AttemptsDialog
        postId={attemptsForPost}
        open={!!attemptsForPost}
        onOpenChange={(v) => !v && setAttemptsForPost(null)}
      />
    </div>
  );
}
