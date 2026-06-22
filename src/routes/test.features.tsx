// Internal QA page for Phase-1 features:
//  1) Voice Search (Web Speech API, ar-SA)
//  2) Cart/Personalized Recommendations (SQL-based)
//  3) Sentiment Analysis (Lovable AI Gemini Flash)
//
// Not linked from the public nav. Use /test/features directly.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Mic, MicOff, Sparkles, Brain, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CartRecommendations } from "@/components/cart-recommendations";
import { useSpeech } from "@/hooks/use-speech";
import { getPersonalizedProducts } from "@/lib/recommendations.functions";
import { analyzeSentiment, type SentimentResult } from "@/lib/sentiment.functions";

export const Route = createFileRoute("/test/features")({
  head: () => ({
    meta: [
      { title: "اختبار الميزات — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TestFeaturesPage,
});

function TestFeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <header>
          <h1 className="text-2xl font-black">🧪 اختبار ميزات المرحلة الأولى</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            صفحة داخلية للتحقق السريع من Voice Search والتوصيات وتحليل المشاعر.
          </p>
        </header>

        <VoiceTest />
        <RecsTest />
        <SentimentTest />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------- 1) Voice ---------- */
function VoiceTest() {
  const { isSupported, isListening, transcript, error, start, stop } = useSpeech("ar-SA");
  const [final, setFinal] = useState("");

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
        <Mic className="size-5 text-primary" /> 1) البحث الصوتي (ar-SA)
      </h2>
      {!isSupported ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          المتصفح لا يدعم Web Speech API (مثل Firefox، أو iOS Safari قديم). جرّب Chrome على Android أو Safari ≥ 14.5.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => (isListening ? stop() : start((t) => setFinal(t)))}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-elevated transition ${
              isListening ? "bg-red-500 animate-pulse" : "brand-gradient"
            }`}
          >
            {isListening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            {isListening ? "إيقاف" : "ابدأ التسجيل وانطق اسم منتج"}
          </button>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="rounded-xl bg-secondary/60 p-3">
              <span className="font-black">نص مؤقت:</span> {transcript || <span className="text-muted-foreground">—</span>}
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <span className="font-black text-emerald-700">نص نهائي:</span> {final || <span className="text-emerald-600/60">—</span>}
            </div>
            {error && <div className="rounded-xl bg-red-50 p-3 text-red-700">خطأ: {error}</div>}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- 2) Recommendations ---------- */
function RecsTest() {
  const fetchRecs = useServerFn(getPersonalizedProducts);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRecs>> | null>(null);
  const [showCartBlock, setShowCartBlock] = useState(false);

  async function run() {
    if (!phone.trim()) return;
    setBusy(true);
    try {
      const r = await fetchRecs({ data: { phone: phone.trim(), limit: 6 } });
      setData(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
        <Sparkles className="size-5 text-primary" /> 2) التوصيات (SQL)
      </h2>
      <div className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="رقم جوال عميل سابق"
          className="flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={run}
          disabled={busy || !phone.trim()}
          className="inline-flex items-center gap-2 rounded-xl brand-gradient px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />} استدعاء
        </button>
        <button
          onClick={() => setShowCartBlock((v) => !v)}
          className="rounded-xl bg-secondary px-3 text-xs font-black hover:bg-accent"
        >
          {showCartBlock ? "إخفاء" : "عرض"} مكوّن السلة
        </button>
      </div>

      {data && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-secondary/40 p-3 text-[11px] leading-relaxed" dir="ltr">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      {showCartBlock && (
        <div className="mt-4">
          <CartRecommendations phone={phone} />
        </div>
      )}
    </section>
  );
}

/* ---------- 3) Sentiment ---------- */
const SAMPLES = [
  "المنتج ممتاز وسرعة التوصيل خرافية، شكراً صيدلية المصلي ❤️",
  "ما في مثله... بس غالي شوي",
  "وصل الطلب متأخر يومين والكرتون مكسور 👎",
  "عادي، لا حلو ولا وحش",
];

function SentimentTest() {
  const fetchSent = useServerFn(analyzeSentiment);
  const [text, setText] = useState(SAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: true; result: SentimentResult } | { ok: false; error: string } | null>(null);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await fetchSent({ data: { text: text.trim() } });
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  const badge =
    result?.ok && result.result.sentiment === "positive"
      ? "bg-emerald-100 text-emerald-800"
      : result?.ok && result.result.sentiment === "negative"
      ? "bg-red-100 text-red-800"
      : "bg-secondary text-muted-foreground";

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
        <Brain className="size-5 text-primary" /> 3) تحليل المشاعر (Lovable AI)
      </h2>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => setText(s)}
            className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold hover:bg-accent"
          >
            {s.slice(0, 24)}…
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={run}
        disabled={busy || !text.trim()}
        className="mt-2 inline-flex items-center gap-2 rounded-xl brand-gradient px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />} حلّل
      </button>

      {result?.ok === false && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          خطأ: {result.error}
          {result.error === "credits_exhausted" && " — يرجى شحن رصيد Lovable AI."}
          {result.error === "rate_limited" && " — تجاوز معدل الطلبات، حاول لاحقًا."}
          {result.error === "ai_not_configured" && " — مفتاح LOVABLE_API_KEY غير مُعدّ."}
        </p>
      )}

      {result?.ok && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${badge}`}>{result.result.sentiment}</span>
            <span className="font-bold">score: {result.result.score.toFixed(2)}</span>
          </div>
          <p className="rounded-xl bg-secondary/60 p-3 leading-relaxed">{result.result.rationale}</p>
        </div>
      )}
    </section>
  );
}
