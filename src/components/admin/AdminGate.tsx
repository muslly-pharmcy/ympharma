// Server-side admin gate for admin-only pages (M7).
// The published bundle for /admin-* is still served to anon, but every
// render performs a server-fn round-trip that verifies the caller is
// admin/owner via has_role(). Failures redirect to /auth.
//
// Drop <AdminGate>…</AdminGate> as the outer wrapper of any admin page
// component to enforce server-side authorization.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const assertCallerIsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOwner } = await context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "owner" } as never,
    );
    const { data: isAdmin } = await context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: "admin" } as never,
    );
    return { ok: Boolean(isOwner || isAdmin) as boolean, user_id: context.userId };
  });

export function AdminGate({ children }: { children: ReactNode }) {
  const check = useServerFn(assertCallerIsAdmin);
  const q = useQuery({
    queryKey: ["admin_gate"],
    queryFn: () => check(),
    retry: false,
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground" dir="rtl">جارٍ التحقق من الصلاحيات…</div>;
  }
  if (q.isError || !q.data?.ok) {
    return <Navigate to="/auth" />;
  }
  return <>{children}</>;
}
