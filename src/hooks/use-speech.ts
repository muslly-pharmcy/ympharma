// Arabic voice search hook — uses the browser Web Speech API (free, no backend).
// Falls back gracefully when unsupported (iOS Safari < 14.5, Firefox desktop).
//
// Usage:
//   const { isSupported, isListening, transcript, start, stop } = useSpeech("ar-SA");
//   <button onClick={() => start((text) => setQuery(text))}>🎤</button>
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) ?? null;
}

export function useSpeech(lang: string = "ar-SA") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  const isSupported = typeof window !== "undefined" && !!getSpeechCtor();

  const stop = useCallback(() => {
    try { ref.current?.stop(); } catch { /* noop */ }
    setIsListening(false);
  }, []);

  const start = useCallback((onFinal?: (text: string) => void) => {
    setError(null);
    setTranscript("");
    const Ctor = getSpeechCtor();
    if (!Ctor) { setError("unsupported"); return; }
    onFinalRef.current = onFinal ?? null;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (ev: any) => {
      const results = ev.results;
      const last = results[results.length - 1];
      const text = last[0].transcript as string;
      setTranscript(text);
      if (last.isFinal && onFinalRef.current) onFinalRef.current(text.trim());
    };
    rec.onerror = (ev: any) => {
      setError(String(ev?.error || "error"));
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);
    ref.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch (e: any) {
      setError(e?.message || "start_failed");
      setIsListening(false);
    }
  }, [lang]);

  useEffect(() => () => { try { ref.current?.abort(); } catch { /* noop */ } }, []);

  return { isSupported, isListening, transcript, error, start, stop };
}
