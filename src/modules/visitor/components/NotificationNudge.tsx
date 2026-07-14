import { Bell, X } from "lucide-react";
import { useNotificationNudge } from "../notifications/useNotificationNudge";

export function NotificationNudge() {
  const { show, dismiss, requestPermission } = useNotificationNudge();
  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="تفعيل الإشعارات"
      dir="rtl"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bell className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">تنبيهات صحية مفيدة؟</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            نبّهنا عند توفر أدوية جديدة، تحديثات دليل الأطباء، ومقالات صحية موثوقة. يمكنك الإيقاف في أي وقت.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={requestPermission}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary-deep"
            >
              تفعيل الإشعارات
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
            >
              لاحقًا
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default NotificationNudge;
