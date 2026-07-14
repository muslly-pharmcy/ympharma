// Phoenix Quick Execution — soft in-page opt-in (no browser Notification.requestPermission).
// Stores preferences in localStorage and posts an analytics event.
import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { trackEvent } from "../analytics/track";

type Prefs = { medicines: boolean; tips: boolean; offers: boolean };
const KEY = "muslly.notify.prefs.v1";
const DEFAULT: Prefs = { medicines: true, tips: true, offers: false };

function readPrefs(): Prefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Prefs> & { savedAt?: string };
    return {
      medicines: !!parsed.medicines,
      tips: !!parsed.tips,
      offers: !!parsed.offers,
    };
  } catch {
    return null;
  }
}

export function NotificationOptIn() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = readPrefs();
    if (existing) {
      setPrefs(existing);
      setSaved(true);
    }
    setHydrated(true);
  }, []);

  const toggle = (k: keyof Prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const onSave = () => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...prefs, savedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
    trackEvent("notification_optin_saved", { medicines: prefs.medicines, tips: prefs.tips, offers: prefs.offers });
    setSaved(true);
  };

  if (!hydrated) return null;

  return (
    <section dir="rtl" aria-labelledby="notify-optin-title" className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-border bg-gradient-to-bl from-primary/5 to-transparent p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bell className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="notify-optin-title" className="text-base font-black sm:text-lg">
              اختر ما يهمّك من التنبيهات
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              نحفظ تفضيلاتك على جهازك — بدون طلب أذونات من المتصفح.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(
                [
                  { k: "medicines" as const, label: "توفّر الأدوية" },
                  { k: "tips" as const, label: "نصائح صحية" },
                  { k: "offers" as const, label: "عروض وخصومات" },
                ]
              ).map(({ k, label }) => (
                <label
                  key={k}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                    prefs[k] ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <span className="font-bold">{label}</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={prefs[k]}
                    onChange={() => toggle(k)}
                    aria-label={label}
                  />
                  <span
                    aria-hidden
                    className={`grid size-5 place-items-center rounded-md border ${
                      prefs[k] ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {prefs[k] && <Check className="size-3.5" />}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={onSave}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary-deep"
              >
                حفظ تفضيلاتي
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Check className="size-4" /> تم الحفظ
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotificationOptIn;
