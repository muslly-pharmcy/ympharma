import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING = "مرحباً! 👋 أنا مساعد صيدلية المصلي. كيف يمكنني مساعدتك في طلباتك، التوصيل، التأمين الطبي، أو الاستفسارات؟";

export function AiChatWidget() {
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next, mode: "services" } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الرد. واتساب: +967 782 878 280" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 end-5 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:scale-105"
          aria-label="افتح الدردشة">
          <MessageCircle className="size-6" />
        </button>
      )}
      {open && (
        <div dir="rtl" className="fixed bottom-5 end-5 z-40 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
          <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-black">دردشة مع مساعد المصلي</p>
              <p className="text-[10px] opacity-90">رد فوري على الأسئلة العامة</p>
            </div>
            <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-white/20" aria-label="إغلاق">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                }`}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> يكتب…
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 border-t border-border p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب رسالتك…"
              className="min-h-10 flex-1 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary" />
            <button type="submit" disabled={loading || !input.trim()}
              className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50" aria-label="إرسال">
              <Send className="size-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
