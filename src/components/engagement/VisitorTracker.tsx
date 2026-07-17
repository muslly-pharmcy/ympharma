import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { getOrCreateVisitorToken } from "@/lib/visitor-token";
import { trackVisitor } from "@/lib/visitor.functions";

export function VisitorTracker() {
  const router = useRouter();
  useEffect(() => {
    const token = getOrCreateVisitorToken();
    if (!token) return;
    const send = (path: string) => {
      void trackVisitor({
        data: {
          visitorToken: token,
          path,
          referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : undefined,
        },
      }).catch(() => {});
    };
    send(window.location.pathname);
    const unsub = router.subscribe("onLoad", (e) => {
      const to = e.toLocation?.pathname;
      if (to) send(to);
    });
    return () => unsub();
  }, [router]);
  return null;
}
