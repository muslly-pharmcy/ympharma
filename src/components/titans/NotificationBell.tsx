import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications.functions";

const iconFor = (type: string) => {
  switch (type) {
    case "prescription_approved":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "prescription_rejected":
      return <XCircle className="w-4 h-4 text-rose-400" />;
    case "refill_reminder":
      return <Clock className="w-4 h-4 text-amber-400" />;
    default:
      return <AlertCircle className="w-4 h-4 text-sky-400" />;
  }
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const fetchList = useServerFn(getUserNotifications);
  const fetchUnread = useServerFn(getUnreadCount);
  const mark = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => fetchList({ data: { limit: 10 } }),
    refetchInterval: 30_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => fetchUnread(),
    refetchInterval: 30_000,
  });

  const markMutation = useMutation({
    mutationFn: (id: string) => mark({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.notifications ?? [];
  const unread = unreadData?.count ?? notifications.filter((n: any) => !n.read).length;

  return (
    <div className="titans-scope relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5 text-white/80" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl z-50">
          <div className="px-4 py-2 border-b border-white/10 text-sm font-semibold text-white">
            الإشعارات
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/60">
              لا توجد إشعارات
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {notifications.map((n: any) => (
                <li
                  key={n.id}
                  className={`p-3 cursor-pointer hover:bg-white/5 ${!n.read_at ? "bg-white/[0.02]" : ""}`}
                  onClick={() => !n.read_at && markMutation.mutate(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {n.title}
                      </div>
                      <div className="text-xs text-white/70 mt-0.5 line-clamp-2">
                        {n.body}
                      </div>
                      <div className="text-[10px] text-white/40 mt-1">
                        {new Date(n.created_at).toLocaleString("ar-SA")}
                      </div>
                    </div>
                    {!n.read_at && (
                      <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
