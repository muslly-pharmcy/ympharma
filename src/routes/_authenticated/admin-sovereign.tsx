import { useState } from "react";
import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router";
import { Brain, Heart, Cpu, Users, Layers, Settings, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SovereignEngineDashboard } from "@/modules/ai-brain/components/SovereignEngineDashboard";
import { MaternalCarePortal } from "@/modules/subscriptions/components/MaternalCarePortal";

export const Route = createFileRoute("/_authenticated/admin-sovereign")({
  head: () => ({
    meta: [
      { title: "مركز القيادة السيادي — Al-Musalli AI-OS" },
      { name: "description", content: "غرف تحكم موحّدة: المخ السيادي، بوابة الأمومة، شبكة الأطباء، والموردين واللوجستيات." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SovereignCommandCenter,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <ErrorComponent error={error} />
        <Button onClick={() => { router.invalidate(); reset(); }}>إعادة المحاولة</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">الصفحة غير موجودة</div>,
});

type Tab = "brain" | "maternal" | "doctors" | "suppliers";

function SovereignCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>("brain");

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col justify-between p-4 z-20 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-fuchsia-500 rounded-xl text-white">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-fuchsia-400">
                Al-Musalli AI-OS
              </h2>
              <p className="text-[9px] text-slate-500">منظومة الإدارة السيادية الفائقة</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("brain")}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === "brain" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4" />
                <span>المخ السيادي والـ 800 أداة</span>
              </div>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            </button>

            <button
              onClick={() => setActiveTab("maternal")}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === "maternal" ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4" />
                <span>بوابة اشتراكات الأمومة</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("doctors")}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === "doctors" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>شبكة الدكاترة والعيادات</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("suppliers")}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === "suppliers" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>الموردين واللوجستيات</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-3 space-y-2">
          <div className="flex items-center gap-2.5 px-2 text-slate-500">
            <Settings className="w-4 h-4" />
            <span className="text-[10px]">إصدار النظام: 5.0 Core</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {activeTab === "brain" && <SovereignEngineDashboard />}
        {activeTab === "maternal" && <MaternalCarePortal />}

        {activeTab === "doctors" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
                  شبكة الأطباء والعيادات التفاعلية (Physician & Doctor Network)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  توجيه المرضى، فحص الروشتات الصادرة، ومطابقة التخصصات الطبية في اليمن.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold border border-blue-500/20">
                12 عيادة شريكة نشطة في عدن
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-400" /> د. سلطان بن علي الخالدي
                  </h4>
                  <p className="text-slate-400">استشاري أمراض الأطفال والرضع</p>
                  <p className="text-[10px] text-slate-500">العيادة: مستشفى الصداقة - الشيخ عثمان</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold">موثق</span>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-400" /> د. سحر محمد أحمد
                  </h4>
                  <p className="text-slate-400">أخصائية أمراض النساء والتوليد ومتابعة العقم</p>
                  <p className="text-[10px] text-slate-500">العيادة: مستشفى بابل - كريتر</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold">موثق</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "suppliers" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300">
                  بوابة الموردين واللوجستيات والمخازن الذكية
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  مطابقة الفواتير بالـ AI، تتبع الصلاحية للرفوف، وحساب السيولة والديون.
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/20">
                نظام إدارة FEFO مفعل
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>الشركة الموردة:</span>
                  <span className="font-bold text-slate-200">الشركة اليمنية لصناعة الأدوية</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>حالة الفاتورة الأخيرة:</span>
                  <span className="text-emerald-400 font-bold">مطابقة ومقبولة بالـ AI</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>الديون المستحقة للموردين:</span>
                  <span className="font-bold text-rose-400">450,000 ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>تاريخ السداد القادم:</span>
                  <span className="font-mono">2026-08-01</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>إجمالي حركات الصندوق اليومية:</span>
                  <span className="font-bold text-emerald-400">1,200,000 ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>الدفع الآجل من الصيدليات:</span>
                  <span className="text-amber-400 font-bold">نشط تحت الرقابة</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
