import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function NotificationsBell() {
  const fetchCount = useServerFn(getUnreadCount);
  const q = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => fetchCount(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const count = q.data?.count ?? 0;

  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
      <Link to="/my-notifications">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] leading-none"
          >
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
