// Public sign-in / sign-up route. Required by:
//   - src/components/admin/AdminGate.tsx (redirects unauthorized users here)
//   - src/routes/_authenticated/route.tsx (redirects anon users here)
// Without this file, both redirects 404 — see TITANUS audit P0-01.

import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — صيدلية المصلي" },
      { name: "description", content: "تسجيل الدخول أو إنشاء حساب جديد في صيدلية المصلي." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(Boolean(data.session));
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(Boolean(s));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("تم تسجيل الدخول");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("تم إنشاء الحساب — تحقق من بريدك إن لزم.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!checked) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (signedIn) {
    const target = (redirect && redirect.startsWith("/")) ? redirect : "/";
    return <Navigate to={target as "/"} />;
  }

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">
            {mode === "in" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-sm text-muted-foreground">صيدلية المصلي</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm">البريد الإلكتروني</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">كلمة المرور</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="mx-auto size-4 animate-spin" /> : mode === "in" ? "دخول" : "إنشاء"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "in" ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب بالفعل؟ تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
