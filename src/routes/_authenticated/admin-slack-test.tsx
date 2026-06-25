import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";
import { testSlackWebhook, sendSlackMessage } from "@/lib/slack.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin-slack-test")({
  head: () => ({
    meta: [
      { title: "اختبار Slack — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSlackTest,
});

function AdminSlackTest() {
  const check = useServerFn(testSlackWebhook);
  const send = useServerFn(sendSlackMessage);
  const [msg, setMsg] = useState("🧪 رسالة اختبار من لوحة الإدارة");

  const status = useQuery({
    queryKey: ["slack", "status"],
    queryFn: () => check(),
  });

  const sendMut = useMutation({
    mutationFn: (text: string) => send({ data: { message: text } }),
    onSuccess: () => toast.success("تم الإرسال إلى Slack ✅"),
    onError: (e: any) => toast.error(e?.message ?? "فشل الإرسال"),
  });

  const valid = status.data?.valid === true;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#2b2b2b]">اختبار Slack Webhook</h1>
        <p className="text-sm text-[#666] mt-1">
          يتحقق من صحة قيمة <code className="text-xs">SLACK_WEBHOOK_URL</code> ويُرسل رسالة تجريبية.
        </p>
      </header>

      <section className="rounded-xl border border-[#e8e6e1] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#2b2b2b] mb-3">حالة الإعداد</h2>
        {status.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <Loader2 className="w-4 h-4 animate-spin" /> جاري الفحص...
          </div>
        ) : valid ? (
          <div className="flex items-start gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            <div className="text-sm">{status.data?.reason}</div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-rose-700">
            <XCircle className="w-5 h-5 mt-0.5" />
            <div className="text-sm">{status.data?.reason ?? "غير معروف"}</div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#e8e6e1] bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#2b2b2b]">إرسال رسالة اختبار</h2>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          className="w-full text-sm rounded-lg border border-[#e8e6e1] p-3 focus:outline-none focus:border-[#2b2b2b]"
          placeholder="نص الرسالة..."
        />
        <button
          onClick={() => sendMut.mutate(msg)}
          disabled={!valid || sendMut.isPending || !msg.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2b2b2b] text-white text-sm hover:bg-black disabled:opacity-50"
        >
          {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          إرسال
        </button>
      </section>

      {!valid && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 space-y-2">
          <div className="font-semibold">كيف تحصل على رابط صحيح؟</div>
          <ol className="list-decimal pr-5 space-y-1">
            <li>افتح <a className="underline" href="https://api.slack.com/apps" target="_blank" rel="noreferrer">api.slack.com/apps</a> وأنشئ تطبيقاً (From scratch).</li>
            <li>Incoming Webhooks → فعّله → Add New Webhook to Workspace → اختر القناة.</li>
            <li>انسخ الرابط الذي يبدأ بـ <code className="text-xs">https://hooks.slack.com/services/T.../B.../...</code></li>
            <li>حدّث السر <code className="text-xs">SLACK_WEBHOOK_URL</code> في الإعدادات بهذه القيمة.</li>
          </ol>
        </section>
      )}
    </div>
  );
}
