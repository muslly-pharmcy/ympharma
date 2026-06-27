import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  analyzePrescriptionWithAI,
  chatWithAICopilot,
  getAIAnalysisHistory,
  clearAICache,
} from "@/lib/ai-clinical-copilot.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin-ai-copilot")({
  head: () => ({
    meta: [
      { title: "AI Clinical Copilot — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAICopilotPage,
});

type ChatMsg = { role: "user" | "assistant"; content: string };

function AdminAICopilotPage() {
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzePrescriptionWithAI);
  const chatFn = useServerFn(chatWithAICopilot);
  const historyFn = useServerFn(getAIAnalysisHistory);
  const clearFn = useServerFn(clearAICache);

  const [prescriptionId, setPrescriptionId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);

  const history = useQuery({
    queryKey: ["ai-copilot", "history"],
    queryFn: () => historyFn({ data: { limit: 20 } }),
  });

  const analyze = useMutation({
    mutationFn: () => analyzeFn({ data: { prescriptionId } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.cached ? "نتيجة من الذاكرة المؤقتة" : "تم التحليل ✅");
        qc.invalidateQueries({ queryKey: ["ai-copilot", "history"] });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التحليل"),
  });

  const chatMut = useMutation({
    mutationFn: (text: string) =>
      chatFn({ data: { message: text, prescriptionId: prescriptionId || undefined } }),
    onSuccess: (res, vars) => {
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setChat((prev) => [
        ...prev,
        { role: "user", content: vars },
        { role: "assistant", content: res.response },
      ]);
      setChatInput("");
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الإرسال"),
  });

  const clearCache = useMutation({
    mutationFn: () => clearFn({}),
    onSuccess: (res) => toast.success(`تم مسح ${res.cleared} عنصر من الذاكرة`),
    onError: (e: any) => toast.error(e?.message ?? "فشل المسح"),
  });

  const report = analyze.data?.success ? analyze.data.report : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            AI Clinical Copilot
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تحليل الروشتات والمحادثة مع مساعد صيدلي ذكي — مدعوم بـ Lovable AI.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearCache.mutate()}
          disabled={clearCache.isPending}
        >
          <Trash2 className="h-4 w-4 ml-2" />
          مسح الذاكرة المؤقتة
        </Button>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Analyze */}
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">🔍 تحليل روشتة</h2>
          <div className="space-y-2">
            <label className="text-sm">معرّف الروشتة (UUID)</label>
            <Input
              value={prescriptionId}
              onChange={(e) => setPrescriptionId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              dir="ltr"
            />
          </div>
          <Button
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending || !prescriptionId}
            className="w-full"
          >
            {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حلّل الآن"}
          </Button>

          {report && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Badge variant={report.riskScore >= 50 ? "destructive" : "secondary"}>
                  درجة الخطر: {report.riskScore}
                </Badge>
                <Badge variant="outline">
                  الثقة: {Math.round(report.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-sm">{report.summary}</p>
              {report.medications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">الأدوية المستخرجة</h3>
                  <ul className="text-sm space-y-1">
                    {report.medications.map((m, i) => (
                      <li key={i} className="text-muted-foreground">
                        • {m.name} {m.dosage ? `— ${m.dosage}` : ""}{" "}
                        {m.frequency ? `(${m.frequency})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">التوصيات</h3>
                  <ul className="space-y-2">
                    {report.recommendations.map((r) => (
                      <li key={r.id} className="text-sm border rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              r.severity === "critical" || r.severity === "high"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {r.severity}
                          </Badge>
                          <span className="font-medium">{r.title}</span>
                        </div>
                        <p className="text-muted-foreground">{r.description}</p>
                        {r.suggestedAction && (
                          <p className="mt-1 text-xs">→ {r.suggestedAction}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Chat */}
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold">💬 اسأل الصيدلي الذكي</h2>
          <div className="h-72 overflow-y-auto border rounded p-3 space-y-3 bg-muted/30">
            {chat.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center mt-20">
                اسأل عن الجرعات أو التداخلات أو أي استفسار صيدلاني.
              </p>
            ) : (
              chat.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm rounded p-2 ${
                    m.role === "user" ? "bg-primary/10 mr-8" : "bg-background ml-8 border"
                  }`}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {m.role === "user" ? "أنت" : "المساعد"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اكتب سؤالك..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatInput.trim()) chatMut.mutate(chatInput.trim());
                }
              }}
            />
            <Button
              onClick={() => chatMut.mutate(chatInput.trim())}
              disabled={chatMut.isPending || !chatInput.trim()}
            >
              {chatMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال"}
            </Button>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-3">📋 آخر التحليلات</h2>
        {history.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : history.data?.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تحليلات سابقة.</p>
        ) : (
          <div className="space-y-2">
            {history.data?.history.map((h: any) => (
              <div
                key={h.id}
                className="text-sm border rounded p-2 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate">{h.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.ai_analyzed_at).toLocaleString("ar")}
                  </div>
                </div>
                <Badge variant="outline">خطر {h.ai_risk_score ?? 0}</Badge>
                <Badge variant="secondary">
                  ثقة {Math.round((h.ai_confidence ?? 0) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
