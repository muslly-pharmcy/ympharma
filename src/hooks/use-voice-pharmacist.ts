// Voice pharmacist hook: Web Speech API recognition + synthesis in Arabic.
// Pass `onTranscript(text)` to wire up your AI/agent handler; the returned
// reply (if any) is spoken back using SpeechSynthesis.
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type WindowWithSR = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export type UseVoicePharmacistOptions = {
  /** Called with the final recognized transcript. Return a string to have it spoken aloud. */
  onTranscript?: (text: string) => Promise<string | void> | string | void;
  lang?: string;
};

export function useVoicePharmacist(options: UseVoicePharmacistOptions = {}) {
  const { onTranscript, lang = "ar-SA" } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as WindowWithSR;
    const hasSR = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    const hasSynth = "speechSynthesis" in window;
    setIsSupported(hasSR && hasSynth);
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    utt.pitch = 1;
    utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((v) => v.lang.startsWith("ar"));
    if (arabicVoice) utt.voice = arabicVoice;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    if (isLoading) return;
    const w = window as WindowWithSR;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setResponse("");
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = async (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) final = text;
        else setTranscript(text);
      }
      if (final) {
        setTranscript(final);
        setIsListening(false);
        recognition.stop();
        if (!onTranscript) return;
        try {
          setIsLoading(true);
          const reply = await onTranscript(final);
          if (typeof reply === "string" && reply.length > 0) {
            setResponse(reply);
            speakText(reply);
          }
        } catch {
          const msg = "عذراً، حدث خطأ في معالجة طلبك.";
          setResponse(msg);
          speakText(msg);
        } finally {
          setIsLoading(false);
        }
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, isLoading, lang, onTranscript, speakText]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    startListening,
    stopListening,
    stopSpeaking,
    speakText,
    isListening,
    isSpeaking,
    isLoading,
    isSupported,
    transcript,
    response,
  };
}
