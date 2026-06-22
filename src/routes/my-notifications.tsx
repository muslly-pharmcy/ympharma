import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, BellOff } from "lucide-react";

export const Route = createFileRoute("/my-notifications")({
  head: () => ({
    meta: [
      { title: "إشعاراتي — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "عرض إشعاراتك الداخلية وتحديدها كمقروءة." },
    ],
  }),
  component: MyNotificationsPage,
});

const PRIORITY_VARIANT: Record<
  NotificationRow["priority"],
  "secondary" | "default" | "destructive"
> = {
  low: "secondary",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

function MyNotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markOneFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);

  const q = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listFn({ data: { limit: 100 } }),
    retry: false,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markOneFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const items = q.data?.notifications ?? [];
  const unread = items.filter((n) => !n.read);

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">إشعاراتي</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={unread.length === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          <CheckCheck className="h-4 w-4 ml-2" />
          تحديد الكل كمقروء
        </Button>
      </div>

      {q.isLoading && <p className="text-muted-foreground">جارٍ التحميل…</p>}
      {q.isError && (
        <p className="text-destructive">
          تعذر تحميل الإشعارات. تأكد من تسجيل الدخول.
        </p>
      )}

      {!q.isLoading && items.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <BellOff className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p>لا توجد إشعارات بعد.</p>
        </Card>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <Card
            key={n.id}
            className={`p-4 transition ${n.read ? "opacity-70" : "border-primary/40"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold">{n.title}</span>
                  <Badge variant={PRIORITY_VARIANT[n.priority]} className="text-[10px]">
                    {n.priority}
                  </Badge>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />}
                </div>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground mt-2">
                  {new Date(n.created_at).toLocaleString("ar")}
                </p>
              </div>
              {!n.read && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markOne.mutate(n.id)}
                  disabled={markOne.isPending}
                >
                  مقروء
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
