// Sovereign Quick Launcher — floating FAB + slide-in vertical sidebar
// linking the 4 command hubs. Visible only to admins.

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Baby, Stethoscope, LayoutDashboard, Sparkles, X, Flame, Activity, Heart, Zap, Leaf } from "lucide-react";
import { assertCallerIsAdmin } from "@/components/admin/AdminGate";
import { cn } from "@/lib/utils";

type Hub = {
  label: string;
  desc: string;
  to: string;
  search?: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const HUBS: Hub[] = [
  {
    label: "مركز القيادة الموحّد",
    desc: "لوحة القيادة السيادية الرئيسية",
    to: "/admin-sovereign",
    icon: LayoutDashboard,
    accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-200",
  },
  {
    label: "المخ والـ 800 أداة",
    desc: "المخ السيادي والاستدلال العصبي",
    to: "/admin-sovereign",
    search: { tab: "brain" },
    icon: Brain,
    accent: "from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/40 text-fuchsia-200",
  },
  {
    label: "الحميات والسعرات",
    desc: "بروتوكولات الحمى والتغذية العلاجية",
    to: "/admin-sovereign",
    search: { tab: "fevers" },
    icon: Flame,
    accent: "from-rose-500/20 to-orange-500/10 border-rose-500/40 text-rose-200",
  },
  {
    label: "المريض المزمن",
    desc: "السكري والضغط والرعاية المستمرة",
    to: "/admin-sovereign",
    search: { tab: "chronic" },
    icon: Activity,
    accent: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-200",
  },
  {
    label: "الأمومة والحوامل",
    desc: "باقات ومتابعة رعاية الأم",
    to: "/admin-sovereign",
    search: { tab: "maternal" },
    icon: Heart,
    accent: "from-pink-500/20 to-rose-500/10 border-pink-500/40 text-pink-200",
  },
  {
    label: "الأطفال والرضع",
    desc: "حاسبة الجرعات وأمان الأدوية",
    to: "/admin-sovereign",
    search: { tab: "kids" },
    icon: Baby,
    accent: "from-blue-500/20 to-teal-500/10 border-blue-500/40 text-blue-200",
  },
  {
    label: "شبكة الأطباء",
    desc: "المتخصصون والعيادات المعتمدة",
    to: "/admin-sovereign",
    search: { tab: "doctors" },
    icon: Stethoscope,
    accent: "from-sky-500/20 to-blue-500/10 border-sky-500/40 text-sky-200",
  },
  {
    label: "المكملات والفيتامينات",
    desc: "دليل المكملات وحزم الرياضيين",
    to: "/admin-sovereign",
    search: { tab: "supplements" },
    icon: Zap,
    accent: "from-yellow-500/20 to-amber-500/10 border-yellow-500/40 text-yellow-200",
  },
  {
    label: "الأعشاب والطب البديل",
    desc: "بروتوكولات علاجية طبيعية آمنة",
    to: "/admin-sovereign",
    search: { tab: "herbs" },
    icon: Leaf,
    accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-200",
  },
];

export function SovereignQuickLauncher() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const check = useServerFn(assertCallerIsAdmin);

  const { data } = useQuery({
    queryKey: ["admin_gate"],
    queryFn: () => check(),
    retry: false,
    staleTime: 60_000,
  });
  const isAdmin = Boolean(data?.ok);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Cmd/Ctrl + K to toggle
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <>
      {/* FAB */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="فتح مركز القيادة السيادي"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 left-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/60 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.55)] focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
        <Sparkles className="relative h-6 w-6" strokeWidth={2.5} />
      </motion.button>

      {/* Sidebar Sheet */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.aside
              key="panel"
              dir="rtl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-[86vw] max-w-sm flex-col border-l border-amber-500/20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="مركز القيادة السيادي"
            >
              <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-amber-300/70">Sovereign Access</p>
                  <h2 className="mt-1 text-lg font-bold text-white">مركز القيادة السريع</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق"
                  className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <nav className="flex-1 space-y-3 overflow-y-auto p-4">
                {HUBS.map((h) => {
                  const Icon = h.icon;
                  const active =
                    location.pathname === h.to &&
                    (!h.search || (location.search as Record<string, string>)?.tab === h.search.tab);
                  return (
                    <Link
                      key={`${h.to}-${h.search?.tab ?? "root"}`}
                      to={h.to}
                      search={h.search ?? {}}
                      className={cn(
                        "group flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-4 transition-all",
                        h.accent,
                        active ? "ring-2 ring-amber-300/60 scale-[1.01]" : "hover:scale-[1.02] hover:brightness-110",
                      )}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950/40 backdrop-blur">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="flex-1 text-right">
                        <span className="block text-base font-semibold text-white">{h.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-300/80">{h.desc}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <footer className="border-t border-white/5 px-5 py-3 text-center text-[11px] text-slate-500">
                اختصار: <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-slate-300">Ctrl / ⌘ + K</kbd>
              </footer>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
