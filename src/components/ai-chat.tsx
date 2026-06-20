import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, MessageCircle, RotateCcw } from "lucide-react";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { buildAiHandoffMessage, waLink } from "@/lib/whatsapp";
import { useMergedProducts } from "@/lib/use-merged-products";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "interactions" | "services" | "supplement" | "symptoms" | "prescription";

export function AiChat({
  mode,
  greeting,
  placeholder,
  suggestions,
}: {
  mode: Mode;
  greeting: string;
  placeholder: string;
  suggestions: string[];
}) {
  const ask = useServerFn(askAssistant);
  const initial: Msg = { role: "assistant", content: greeting };
  const [messages, setMessages] = useState<Msg[]>([initial]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real products from DB+catalog → fed to AI for supplement/symptoms recommendation modes
  const products = useMergedProducts();
  const productHints = useMemo(() => {
    if (mode !== "supplement" && mode !== "symptoms") return undefined;
    // Keep payload small; prioritize relevant categories per mode
    const relevant = products.filter((p) => {
      if (mode === "supplement") return ["vitamins", "now", "herbal"].includes(p.cat);
      return ["medicine", "vitamins", "devices"].includes(p.cat);
    });
    return relevant.slice(0, 40).map((p) => ({ name: p.name, cat: p.cat, price: p.price }));
  }, [products, mode]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next, mode, productHints } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الرد الآن. تواصل واتساب: +967 782 878 280" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function reset() {
    setMessages([initial]);
    setInput("");
    inputRef.current?.focus();
  }

  // Smart WhatsApp handoff: send summarized conversation + last AI recommendations
  const waHref = useMemo(() => {
    const msg = buildAiHandoffMessage({ topic: mode, messages });
    return waLink(msg);
  }, [messages, mode]);

  const hasConversation = messages.length > 1;

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
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
            className="min-h-11 flex-1 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary" />
          {hasConversation && (
            <button type="button" onClick={reset} title="محادثة جديدة"
              className="grid size-11 place-items-center rounded-xl border border-border bg-secondary text-muted-foreground transition hover:bg-accent">
              <RotateCcw className="size-4" />
            </button>
          )}
          <button type="submit" disabled={loading || !input.trim()}
            className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-deep disabled:opacity-50" aria-label="إرسال">
            <Send className="size-5 rtl:rotate-180" />
          </button>
        </form>
      </div>

      <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
        ⚠️ تنبيه طبي: هذه المعلومات إرشادية فقط ولا تغني عن استشارة الطبيب أو الصيدلي المختص. في حالات الطوارئ اتصل بالطوارئ فوراً.
      </p>

      <a href={waHref} target="_blank" rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-100">
        <MessageCircle className="size-5" />
        {hasConversation ? "أرسل ملخص المحادثة لصيدلي عبر واتساب" : "تحدّث مع صيدلي عبر واتساب"}
      </a>
    </>
  );
}
