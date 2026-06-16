import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { waLink } from "@/lib/whatsapp";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "interactions" | "services" | "supplement" | "symptoms";

export function AiChat({
  mode,
  greeting,
  placeholder,
  suggestions,
  waMessage = "استشارة من موقع صيدلية المصلي",
}: {
  mode: Mode;
  greeting: string;
  placeholder: string;
  suggestions: string[];
  waMessage?: string;
}) {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
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
      const res = await ask({ data: { messages: next, mode } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الرد الآن. تواصل واتساب: +967 782 878 280" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="max-h-[55vh] min-h-[280px] space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
              }`}>{m.content}</div>
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

        {messages.length <= 1 && suggestions.length > 0 && (
          <div className="border-t border-border p-3">
            <p className="mb-2 text-xs font-bold text-muted-foreground">أمثلة سريعة:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold transition hover:border-primary hover:bg-primary/10">{s}</button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
            className="min-h-11 flex-1 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={loading || !input.trim()}
            className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50" aria-label="إرسال">
            <Send className="size-5 rtl:rotate-180" />
          </button>
        </form>
      </div>

      <a href={waLink(waMessage)} target="_blank" rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">
        <MessageCircle className="size-4" /> تحدّث مباشرة مع صيدلي عبر واتساب
      </a>
    </>
  );
}
