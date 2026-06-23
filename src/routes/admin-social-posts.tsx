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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  AlertCircle,
  Stethoscope,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listSocialPosts,
  regenerateDailyPostsNow,
  publishPostNow,
  deleteSocialPost,
  listPostAttempts,
  getPostStats,
  pingN8nWebhook,
} from "@/lib/social.functions";
import { runFullDiagnostics } from "@/lib/diagnostics.functions";

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

function AttemptRow({ a }: { a: any }) {
  const [open, setOpen] = useState(false);
  const isSuccess = a.status === "success";
  const isSkip = a.status === "skipped" || a.idempotent_skip;
  const isFail = a.status === "failed";
  const variant = isSuccess ? "default" : isSkip ? "secondary" : "destructive";
  const label = isSuccess ? "نجاح" : isSkip ? "تخطي (تكرار)" : "فشل";

  return (
    <div className="rounded-md border p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant as any}>#{a.attempt_no} • {label}</Badge>
        <Badge variant="outline">{a.source}</Badge>
        {a.source === "callback" && (
          a.hmac_valid ? (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600">
              <ShieldCheck className="size-3" /> HMAC ✓
            </Badge>
          ) : a.hmac_valid === false ? (
            <Badge variant="outline" className="gap-1 text-destructive border-destructive">
              <ShieldAlert className="size-3" /> HMAC ✗
            </Badge>
          ) : null
        )}
        {a.response_status != null && (
          <Badge variant="outline">HTTP {a.response_status}</Badge>
        )}
        <span className="text-muted-foreground ms-auto">
          {new Date(a.created_at).toLocaleString("ar")}
        </span>
      </div>
      {a.external_id ? <div>external_id: <code className="text-[10px]">{a.external_id}</code></div> : null}
      {a.error_message ? <div className="text-destructive">{a.error_message}</div> : null}

      {(a.request_payload || a.response_body) && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">
              <ChevronDown className={`size-3 ms-1 transition-transform ${open ? "rotate-180" : ""}`} />
              التفاصيل التقنية
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            {a.request_payload ? (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Payload المرسل:</div>
                <pre className="bg-muted/50 rounded p-2 text-[10px] overflow-auto max-h-40 leading-tight">
                  {JSON.stringify(a.request_payload, null, 2)}
                </pre>
              </div>
            ) : null}
            {a.response_body ? (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">رد n8n:</div>
                <pre className="bg-muted/50 rounded p-2 text-[10px] overflow-auto max-h-40 leading-tight">
                  {a.response_body}
                </pre>
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
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
            {(attempts.data ?? []).map((a: any) => <AttemptRow key={a.id} a={a} />)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PingResultDialog({
  result,
  open,
  onOpenChange,
}: {
  result: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!result) return null;
  const ok = result.ok;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ok ? "✅ نجح الاتصال بـ n8n" : <><AlertCircle className="size-5 text-destructive" /> فشل الاتصال بـ n8n</>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border p-2">
              <div className="text-[10px] text-muted-foreground">HTTP code</div>
              <div className={`font-mono ${ok ? "text-emerald-600" : "text-destructive"}`}>{result.status || "—"}</div>
            </div>
            <div className="rounded border p-2">
              <div className="text-[10px] text-muted-foreground">المدة</div>
              <div className="font-mono">{result.durationMs} ms</div>
            </div>
          </div>
          {result.url ? (
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">URL</div>
              <code className="block bg-muted/50 rounded p-2 text-[11px] break-all">{result.url}</code>
            </div>
          ) : null}
          {result.errorDetail ? (
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">سبب الفشل</div>
              <pre className="bg-destructive/10 text-destructive rounded p-2 text-[11px] whitespace-pre-wrap">
                {result.errorDetail}
              </pre>
            </div>
          ) : null}
          {result.body ? (
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">رد n8n (raw)</div>
              <pre className="bg-muted/50 rounded p-2 text-[10px] overflow-auto max-h-60 leading-tight">
                {result.body}
              </pre>
            </div>
          ) : null}
          {result.payload ? (
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5">Payload المرسل</div>
              <pre className="bg-muted/50 rounded p-2 text-[10px] overflow-auto max-h-40 leading-tight">
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiagnosticsDialog({
  result,
  open,
  onOpenChange,
}: {
  result: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!result) return null;
  const s = result.summary ?? { pass: 0, fail: 0, warn: 0, skip: 0 };
  const icon = (st: string) =>
    st === "pass" ? <CheckCircle2 className="size-4 text-emerald-600" /> :
    st === "fail" ? <XCircle className="size-4 text-destructive" /> :
    st === "warn" ? <AlertCircle className="size-4 text-amber-500" /> :
    <MinusCircle className="size-4 text-muted-foreground" />;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="size-5" /> تقرير التشخيص الشامل
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 flex-wrap text-xs">
          <Badge className="bg-emerald-600">نجح {s.pass}</Badge>
          {s.fail > 0 && <Badge variant="destructive">فشل {s.fail}</Badge>}
          {s.warn > 0 && <Badge className="bg-amber-500">تحذير {s.warn}</Badge>}
          {s.skip > 0 && <Badge variant="outline">تخطّى {s.skip}</Badge>}
        </div>
        <div className="space-y-1.5 max-h-[60vh] overflow-auto">
          {(result.checks ?? []).map((c: any) => (
            <div key={c.id} className="rounded border p-2 text-xs flex gap-2">
              <div className="mt-0.5">{icon(c.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.label}</span>
                  {c.durationMs != null && <span className="text-[10px] text-muted-foreground">{c.durationMs}ms</span>}
                </div>
                <div className={`break-words ${c.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>
                  {c.message}
                </div>
                {c.detail ? (
                  <pre className="bg-muted/50 rounded p-1.5 mt-1 text-[10px] overflow-auto max-h-32 leading-tight">
                    {c.detail}
                  </pre>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminSocialPostsPage() {
  const qc = useQueryClient();
  const [attemptsForPost, setAttemptsForPost] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [diagResult, setDiagResult] = useState<any | null>(null);

  const listFn = useServerFn(listSocialPosts);
  const regenFn = useServerFn(regenerateDailyPostsNow);
  const publishFn = useServerFn(publishPostNow);
  const deleteFn = useServerFn(deleteSocialPost);
  const pingFn = useServerFn(pingN8nWebhook);
  const diagFn = useServerFn(runFullDiagnostics);

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
      if (r?.idempotent) toast.message("⏭️ تم تخطيه (سبق نشره)");
      else if (r?.ok) toast.success(`تم النشر (محاولة #${r.attempt_no ?? "?"})`);
      else toast.error(r?.error ?? "فشل النشر");
      qc.invalidateQueries({ queryKey: ["admin-social-posts"] });
      qc.invalidateQueries({ queryKey: ["social-post-attempts"] });
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

  const ping = useMutation({
    mutationFn: () => pingFn(),
    onSuccess: (r: any) => {
      setPingResult(r);
      if (r?.ok) toast.success(`n8n استجاب ✅ (HTTP ${r.status} • ${r.durationMs}ms)`);
      else toast.error(`فشل ping n8n — اضغط للتفاصيل`);
    },
    onError: (e: any) => {
      setPingResult({ ok: false, status: 0, errorDetail: e?.message, durationMs: 0, body: "" });
      toast.error(e?.message ?? "فشل الاتصال بـ n8n");
    },
  });

  const diag = useMutation({
    mutationFn: () => diagFn(),
    onSuccess: (r: any) => {
      setDiagResult(r);
      const s = r?.summary;
      if (s?.fail > 0) toast.error(`التشخيص: ${s.fail} فشل، ${s.pass} نجح`);
      else if (s?.warn > 0) toast.message(`التشخيص: ${s.warn} تحذير، ${s.pass} نجح`);
      else toast.success(`التشخيص ✅ كل ${s?.pass ?? 0} اختبار نجح`);
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التشخيص"),
  });

  return (
    <div dir="rtl" className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">📢 المنشورات اليومية</h1>
          <p className="text-sm text-muted-foreground">
            تُولَّد تلقائياً يومياً 8 صباحاً وتُرسَل إلى n8n للنشر، والإحصائيات تُجمَع كل ساعة.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => diag.mutate()} disabled={diag.isPending}>
            {diag.isPending ? <Loader2 className="size-4 ms-2 animate-spin" /> : <Stethoscope className="size-4 ms-2" />}
            تشخيص شامل
          </Button>
          <Button variant="outline" onClick={() => ping.mutate()} disabled={ping.isPending}>
            {ping.isPending ? <Loader2 className="size-4 ms-2 animate-spin" /> : <ShieldCheck className="size-4 ms-2" />}
            تحقق من n8n
          </Button>
          <Button onClick={() => regen.mutate()} disabled={regen.isPending}>
            {regen.isPending ? (
              <Loader2 className="size-4 ms-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 ms-2" />
            )}
            توليد الآن
          </Button>
        </div>
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
            <Card key={post.id} className={post.status === "failed" ? "border-destructive/50" : undefined}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{PLATFORM_LABEL[post.platform] ?? post.platform}</Badge>
                  <StatusBadge status={post.status} />
                  {post.attempt_count > 0 && (
                    <Badge variant="secondary">آخر محاولة: #{post.attempt_count}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleString("ar")}
                  </span>
                </div>

                {post.error_message ? (
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive flex gap-2">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-0.5">آخر خطأ:</div>
                      <div className="whitespace-pre-wrap break-words">{post.error_message}</div>
                    </div>
                  </div>
                ) : null}

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

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={post.status === "failed" ? "default" : post.status === "published" ? "outline" : "default"}
                    onClick={() => publish.mutate(post.id)}
                    disabled={publish.isPending}
                  >
                    <Send className="size-3.5 ms-1.5" />
                    {post.status === "published"
                      ? "إعادة النشر (idempotent)"
                      : post.status === "failed"
                        ? `إعادة المحاولة (#${(post.attempt_count ?? 0) + 1})`
                        : "نشر الآن"}
                  </Button>
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

      <PingResultDialog
        result={pingResult}
        open={!!pingResult}
        onOpenChange={(v) => !v && setPingResult(null)}
      />
    </div>
  );
}
