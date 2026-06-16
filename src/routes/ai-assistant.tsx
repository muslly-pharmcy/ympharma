import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Stethoscope, ShieldAlert, Loader2, MessageCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "استشارة التفاعلات الدوائية — صيدلية المصلي" },
      { name: "description", content: "اسأل المساعد الصيدلي الرقمي لصيدلية المصلي عن التفاعلات بين الأدوية والأعشاب والأطعمة، إجابات فورية وموثوقة." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/ai-assistant" }],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "هل يمكن أخذ الباراسيتامول مع الإيبوبروفين؟",
  "تفاعل الوارفارين مع الزنجبيل؟",
  "هل يؤثر العصير على دواء الضغط؟",
  "متى آخذ الحديد مع الكالسيوم؟",
];

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "أهلاً بك في صيدلية المصلي 👋\nأنا المساعد الصيدلي الرقمي. اسألني عن أي تفاعل دوائي بين دوائين، أو بين دواء وعشبة، أو دواء وطعام، وسأوضح لك مستوى الخطورة والإجراء الموصى به." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next, mode: "interactions" } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الرد الآن. للاستشارة الفورية تواصل واتساب: +967 782 878 280" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 rounded-2xl brand-gradient p-5 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><Stethoscope className="size-6" /></div>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">استشارة التفاعلات الدوائية</h1>
              <p className="text-xs text-white/85">مساعد صيدلية المصلي الرقمي — متاح 24/7</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-3 text-xs leading-relaxed ring-1 ring-white/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            هذه المعلومات إرشادية ولا تغني عن استشارة الصيدلي المختص. للحالات الحرجة تواصل معنا فورًا.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="max-h-[55vh] min-h-[280px] space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> يكتب الرد...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-border p-3">
              <p className="mb-2 text-xs font-bold text-muted-foreground">أمثلة سريعة:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold transition hover:border-primary hover:bg-primary/10">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب اسم الدوائين أو العشبة..."
              className="min-h-11 flex-1 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50"
              aria-label="إرسال"
            >
              <Send className="size-5 rtl:rotate-180" />
            </button>
          </form>
        </div>

        <a
          href={waLink("استشارة صيدلانية")}
          target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
        >
          <MessageCircle className="size-4" /> تحدّث مباشرة مع صيدلي عبر واتساب
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
