import { useEffect, useState } from "react";
import { getOrCreateVisitorToken } from "@/lib/visitor-token";
import { requestPushSubscription } from "@/lib/push/register-sw";

const DISMISS_KEY = "musalli_push_dismissed_at";
const DELAY_MS = 20_000;

export function PushOptInCard() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    const dismissed = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissed < 7 * 24 * 3600 * 1000) return;
    const t = window.setTimeout(() => setVisible(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-teal-800/60 bg-slate-900/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-teal-100">
            نصائح صحية أسبوعية من المصلي
          </div>
          <p className="mt-1 text-xs text-teal-200/80 leading-relaxed">
            فعّل الإشعارات لتصلك نصيحة طبية موثوقة كل بضعة أيام. يمكنك إيقافها في أي وقت.
          </p>
          {status && <p className="mt-2 text-xs text-amber-300">{status}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setStatus(null);
                const token = getOrCreateVisitorToken();
                const res = await requestPushSubscription(token);
                setBusy(false);
                if (res.ok) {
                  setStatus("تم التفعيل ✓");
                  setTimeout(() => setVisible(false), 1200);
                } else if (res.reason === "denied") {
                  setStatus("رفضت المتصفح — يمكن التفعيل لاحقاً من إعدادات الموقع.");
                } else {
                  setStatus("تعذر التفعيل. حاول مجدداً لاحقاً.");
                }
              }}
              className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-teal-400 disabled:opacity-60"
            >
              {busy ? "..." : "تفعيل"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
                setVisible(false);
              }}
              className="rounded-lg border border-teal-800 px-3 py-1.5 text-xs text-teal-200 hover:bg-teal-950"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
