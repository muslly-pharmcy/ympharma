import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/futuristic/GlassCard";
import { MotionEase, MotionSystem } from "@/lib/motion-system";
import { Activity, Building2, Pill, Stethoscope, Users } from "lucide-react";

const AICore3D = React.lazy(() => import("@/components/futuristic/AICore3D"));

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MUSLLY AI OS — منصة الذكاء الصحي المستقبلية" },
      {
        name: "description",
        content:
          "نظام تشغيل الرعاية الصحية الذكي: يربط الأطباء والصيدليات والمستشفيات والمرضى في منظومة عصبية ذكية.",
      },
      { property: "og:title", content: "MUSLLY AI OS — The Future Intelligence Platform" },
      {
        property: "og:description",
        content: "Living healthcare digital universe powered by AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomePage,
});

const nodes = [
  { icon: Stethoscope, label: "الأطباء", labelEn: "Doctors", to: "/doctors" },
  { icon: Pill, label: "الصيدليات", labelEn: "Pharmacies", to: "/pn-directory" },
  { icon: Building2, label: "المستشفيات", labelEn: "Hospitals", to: "/find-care" },
  { icon: Users, label: "المرضى", labelEn: "Patients", to: "/patient-portal" },
];

function WelcomePage() {
  return (
    <div dir="rtl" className="deep-space-bg min-h-screen relative overflow-hidden text-white">
      {/* Neural grid overlay */}
      <div className="absolute inset-0 neural-grid-bg opacity-40 pointer-events-none" />

      {/* Ambient orbs */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl"
           style={{ background: "radial-gradient(circle, #00E5FF, transparent 65%)" }} />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: "radial-gradient(circle, #20D98A, transparent 65%)" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MotionSystem.smooth, ease: MotionEase.ai }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center ai-glow"
                 style={{ background: "linear-gradient(135deg,#00A8B5,#00E5FF)" }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-wide">MUSLLY AI OS</span>
          </div>
          <Link to="/" className="text-sm text-cyan-100/70 hover:text-white transition-colors">
            دخول لوحة القيادة →
          </Link>
        </motion.div>

        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: MotionSystem.smooth, ease: MotionEase.ai }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
              style={{
                background: "color-mix(in oklab, #00E5FF 12%, transparent)",
                border: "1px solid color-mix(in oklab, #00E5FF 30%, transparent)",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#20D98A] animate-ai-pulse" />
              <span className="text-xs font-semibold tracking-wider">FUTURE INTELLIGENCE PLATFORM · 2026</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: MotionSystem.cinematic, ease: MotionEase.ai }}
              className="text-5xl md:text-6xl font-black leading-tight mb-4"
            >
              <span className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg,#FFFFFF 0%,#00E5FF 100%)" }}>
                نظام التشغيل الذكي
              </span>
              <br />
              <span className="text-white/90">للرعاية الصحية</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: MotionSystem.smooth }}
              className="text-lg text-cyan-100/70 mb-8 max-w-md leading-relaxed"
            >
              منظومة عصبية حية تربط الأطباء والصيدليات والمستشفيات والمرضى، بذكاء اصطناعي طبي يتعلّم ويتطوّر.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: MotionSystem.normal }}
              className="flex gap-3"
            >
              <Link
                to="/find-care"
                className="px-6 py-3 rounded-xl font-bold text-[#061B24] ai-glow transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg,#00E5FF,#20D98A)" }}
              >
                ابدأ الرحلة
              </Link>
              <Link
                to="/doctors"
                className="px-6 py-3 rounded-xl font-semibold glass-3-dark hover:bg-white/5 transition-colors"
              >
                استكشف الأطباء
              </Link>
            </motion.div>
          </div>

          {/* AI Core */}
          <ClientOnly fallback={<div className="h-[520px] w-full rounded-3xl glass-3-dark animate-ai-pulse" />}>
            <Suspense fallback={<div className="h-[520px] w-full rounded-3xl glass-3-dark animate-ai-pulse" />}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: MotionSystem.cinematic, ease: MotionEase.ai }}
              >
                <AICore3D height={520} />
              </motion.div>
            </Suspense>
          </ClientOnly>
        </div>

        {/* Network nodes */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: MotionSystem.smooth, ease: MotionEase.ai }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
        >
          {nodes.map((n, i) => (
            <Link key={n.label} to={n.to}>
              <GlassCard variant="dark" className="group cursor-pointer hover:border-[#00E5FF]/40 h-full">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ background: "color-mix(in oklab, #00E5FF 18%, transparent)" }}>
                    <n.icon className="w-6 h-6 text-[#00E5FF] group-hover:text-[#20D98A] transition-colors" />
                  </div>
                  <div className="font-bold text-white">{n.label}</div>
                  <div className="text-xs text-cyan-100/50 tracking-widest">{n.labelEn}</div>
                </motion.div>
              </GlassCard>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
