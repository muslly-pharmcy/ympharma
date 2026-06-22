// Browser hook for chatting with the WhatsApp AI agent via an authenticated
// TanStack server function. Tracks messages, loading, errors, and cancels
// in-flight requests when a new message is sent.
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithWhatsAppAgent } from "@/lib/whatsapp-agent.functions";

export type AgentMessage = {
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  intent?: string | null;
  escalated?: boolean;
};

export function useWhatsAppAgent(defaultPhone?: string) {
  const chat = useServerFn(chatWithWhatsAppAgent);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, phone?: string): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const phoneNumber = phone || defaultPhone;
      if (!phoneNumber) {
        setError("رقم الهاتف مطلوب");
        return null;
      }

      setMessages((prev) => [
        ...prev,
        { text: trimmed, sender: "user", timestamp: new Date() },
      ]);
      setIsLoading(true);
      setError(null);

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      try {
        const history = messages.slice(-10).map((m) => ({
          role: m.sender,
          content: m.text,
        }));
        const result = await chat({ data: { phone: phoneNumber, incoming: trimmed, history } });
        if (signal.aborted) return null;

        if (!result.ok) {
          setError(result.error);
          setMessages((prev) => [
            ...prev,
            { text: result.reply, sender: "assistant", timestamp: new Date() },
          ]);
          return result.reply;
        }

        setMessages((prev) => [
          ...prev,
          {
            text: result.reply,
            sender: "assistant",
            timestamp: new Date(),
            intent: result.intent,
            escalated: result.escalated,
          },
        ]);
        return result.reply;
      } catch (err) {
        if (signal.aborted) return null;
        const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
        setError(msg);
        return null;
      } finally {
        if (!signal.aborted) setIsLoading(false);
        if (abortRef.current?.signal === signal) abortRef.current = null;
      }
    },
    [chat, defaultPhone, messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { messages, isLoading, error, sendMessage, clearMessages, clearError };
}
