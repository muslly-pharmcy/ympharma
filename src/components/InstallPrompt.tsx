import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "muslly_install_dismissed_at";
const DISMISS_DAYS = 14;

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already installed (standalone) — never show.
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Inside Lovable preview iframe — never show.
    if (window.self !== window.top) return;
    const host = window.location.hostname;
    if (
      host.startsWith("id-preview--") ||
      host.startsWith("preview--") ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovableproject-dev.com")
    ) return;
    // Recently dismissed?
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (ts && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => null);
    setShow(false);
    setEvt(null);
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Download className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-foreground">📱 ثبّت تطبيق صيدلية المصلي</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">وصول أسرع وعمل عند ضعف الشبكة.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={install} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:opacity-90">
              تثبيت الآن
            </button>
            <button onClick={dismiss} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-accent">
              ليس الآن
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="إغلاق" className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
