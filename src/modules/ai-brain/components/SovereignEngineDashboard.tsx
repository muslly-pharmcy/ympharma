import React, { useEffect, useState } from "react";
import {
  Cpu, Sparkles, ShieldCheck, Zap, Globe, Code2, Award, BarChart3,
  RotateCw, Play, AlertCircle, Bell, X, Heart,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { executeNeuralInference } from "../functions/brain.functions";
import type { BrainDecisionMatrix } from "../domain/types";

const PROMOTIONAL_CAMPAIGNS = [
  { id: 1, title: "رعاية كاملة لطفلك 👶", text: "اشتركي الآن في باقة الأمومة الشهرية واحملي عبء التفكير عن كاهلك مع حسم 10% وتوصيل مجاني لبيتك بالمنصورة!" },
  { id: 2, title: "مستعدون لسلامتك ❤️", text: "هل تعانين من الضغط أو السكري؟ المخ الذكي لصيدلية المصلي يدقق روشتتك طبياً ويقترح البدائل الأكثر أماناً بلمسة زر." },
  { id: 3, title: "صيف عدن أكثر رطوبة ☀️", text: "وفرنا حزم العناية ببشرة الأطفال والترطيب الفائق ومكملات الطاقة الصيفية بخصومات خاصة لأول 100 طلب اليوم." },
];

// Blueprint tool cards mapped to the real dispatched codes emitted by decide().
interface RegistryTool {
  code: string;
  name: string;
  icon: typeof ShieldCheck;
  category: string;
  description: string;
  realCodes: string[];
  tint: string; // idle category tint
}

const REAL_TOOL_REGISTRY: RegistryTool[] = [
  { code: "MED_AGENT_TOOL_001", name: "فحص وتدقيق موانع الصرف", icon: ShieldCheck, category: "الطبية", description: "تدقيق الحالات المزمنة وتعارض الأدوية", realCodes: ["MED_DRUG_SAFETY"], tint: "text-sky-300/80 border-sky-500/10 bg-sky-500/5" },
  { code: "MED_AGENT_TOOL_002", name: "البدائل العلمية التلقائية", icon: Sparkles, category: "الطبية", description: "اقتراح المركبات المكافئة عند شح الصنف", realCodes: ["MED_ALT_SUGGEST"], tint: "text-sky-300/80 border-sky-500/10 bg-sky-500/5" },
  { code: "LOG_AGENT_TOOL_003", name: "التوزيع والتوجيه الجغرافي", icon: Globe, category: "اللوجستية", description: "تحديد أقرب فرع يمتلك الدواء في اليمن", realCodes: ["LOG_PHARMACY_NEARBY", "GEO_DISTRICT_ROUTER"], tint: "text-amber-300/80 border-amber-500/10 bg-amber-500/5" },
  { code: "LOG_AGENT_TOOL_009", name: "الجرد وتتبع الصلاحية FEFO", icon: BarChart3, category: "اللوجستية", description: "أولوية الصرف للباتشات الأقرب انتهاءً", realCodes: ["COM_RESTOCK_ALERT"], tint: "text-amber-300/80 border-amber-500/10 bg-amber-500/5" },
  { code: "MAT_AGENT_TOOL_004", name: "أتمتة اشتراكات الأمومة والطفل", icon: Zap, category: "المرأة والطفل", description: "حساب دورات استهلاك الحليب والحفاضات", realCodes: ["MAT_CAMPAIGN_BUILDER"], tint: "text-fuchsia-300/80 border-fuchsia-500/10 bg-fuchsia-500/5" },
  { code: "MAT_AGENT_TOOL_011", name: "رسائل التذكير والرعاية الذكية", icon: Cpu, category: "المرأة والطفل", description: "إرسال الإشعارات الدورية للأمهات عبر الواتساب", realCodes: ["MAT_CAMPAIGN_BUILDER"], tint: "text-fuchsia-300/80 border-fuchsia-500/10 bg-fuchsia-500/5" },
  { code: "COD_AGENT_TOOL_001", name: "الترميم والتصحيح الذاتي للأكواد", icon: Code2, category: "التطوير", description: "فحص واستبدال الأكواد محلياً وسحابياً", realCodes: [], tint: "text-slate-400 border-slate-500/10 bg-slate-500/5" },
  { code: "ATT_AGENT_TOOL_005", name: "التخطيط التوسعي والحملات", icon: Award, category: "النمو والانتشار", description: "دراسة السوق والمنافسين واكتساح فئات جديدة", realCodes: ["LOG_ETA_ESTIMATE"], tint: "text-emerald-300/80 border-emerald-500/10 bg-emerald-500/5" },
];

const CHRONIC_LABEL_TO_KEY: Record<string, "diabetes" | "hypertension" | "pregnant"> = {
  "سكري": "diabetes",
  "ضغط": "hypertension",
  "حامل": "pregnant",
};

export const SovereignEngineDashboard: React.FC = () => {
  const [district, setDistrict] = useState("عدن");
  const [userInput, setUserInput] = useState("أريد حليب أطفال ومسكن آمن لمرضى الضغط");
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [decision, setDecision] = useState<BrainDecisionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const runInference = useServerFn(executeNeuralInference);

  const toggleChronic = (condition: string) => {
    setChronicConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition],
    );
  };

  const handleStartInference = async () => {
    setIsLoading(true);
    setDecision(null);
    try {
      const chronic = chronicConditions
        .map((c) => CHRONIC_LABEL_TO_KEY[c])
        .filter((v): v is "diabetes" | "hypertension" => v === "diabetes" || v === "hypertension");
      const pregnant = chronicConditions.includes("حامل");
      const res = await runInference({
        data: {
          userInput,
          district,
          patient: {
            chronicConditions: chronic,
            pregnant,
          },
        },
      });
      setDecision(res);
    } catch (err) {
      console.error("Inference Error:", err);
      toast.error("تعذّر تشغيل الاستنتاج العصبي — تحقق من الاتصال أو الصلاحيات.");
    } finally {
      setIsLoading(false);
    }
  };

  const dispatched = new Set(decision?.dispatchedTools ?? []);
  const activeCount = REAL_TOOL_REGISTRY.filter((t) =>
    t.realCodes.some((c) => dispatched.has(c)),
  ).length;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl font-sans" dir="rtl">
      {/* Injected keyframes for the glowing neural pulse */}
      <style>{`
        @keyframes sovereign-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55), 0 0 22px 4px rgba(16,185,129,0.25); }
          50%      { box-shadow: 0 0 0 6px rgba(16,185,129,0.05), 0 0 34px 10px rgba(217,70,239,0.35); }
        }
        @keyframes sovereign-scan {
          0%   { opacity: 0.25; transform: translateY(4px); }
          50%  { opacity: 0.9;  transform: translateY(0); }
          100% { opacity: 0.25; transform: translateY(4px); }
        }
        .sovereign-glow  { animation: sovereign-glow 1.8s ease-in-out infinite; }
        .sovereign-scan  { animation: sovereign-scan 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-fuchsia-400">
            أوركسترا المخ السيادي والـ 8 أدوات الحقيقية
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            لوحة قيادة تفاعلية متصلة بالـ Server Function الفعلي لتنسيق المعاملات، حماية المرضى، والتعلم الذاتي المستمر في اليمن.
          </p>
        </div>
        <button
          onClick={handleStartInference}
          disabled={isLoading}
          aria-busy={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-900 disabled:text-slate-600 text-white font-bold rounded-2xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/10"
        >
          {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isLoading ? "جاري تشغيل المعاملة عصبياً..." : "إطلاق وتنشيط الدماغ الخارق"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-5 h-fit">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <Cpu className="w-4 h-4 text-emerald-400" /> مدخلات الفحص والتحليل
          </h3>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">المنطقة الجغرافية المستهدفة:</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="عدن">عدن (المركز الرئيسي)</option>
              <option value="صنعاء">صنعاء</option>
              <option value="تعز">تعز</option>
              <option value="المكلا">المكلا</option>
              <option value="الحديدة">الحديدة</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">الحالة المرضية / الإشارات المصاحبة:</label>
            <div className="flex flex-wrap gap-1.5">
              {["سكري", "ضغط", "حامل"].map((cond) => {
                const active = chronicConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleChronic(cond)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${active ? "bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/30" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300"}`}
                  >
                    {cond === "حامل" ? "🤰 حامل" : cond === "ضغط" ? "❤️ ضغط" : "🩸 سكري"}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">تفاصيل الطلب أو الروشتة الواردة:</label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 h-28 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-fuchsia-400" /> استنتاجات شريكك والقرارات التشغيلية
            </h3>
            {isLoading && (
              <div className="text-center py-24 text-slate-500 text-xs">
                <RotateCw className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-spin" />
                <p className="sovereign-scan">الدماغ يحفز الـ Webhook ويستعرض موانع الصرف وتوجيهات الفروع...</p>
              </div>
            )}
            {!isLoading && !decision && (
              <div className="text-center py-24 text-slate-500 text-xs">
                <Cpu className="w-12 h-12 mx-auto mb-4 opacity-10 animate-bounce" />
                <p>أدخل بيانات الطلب باليمين ثم اضغط إطلاق لتشاهد نبض الخلايا العصبية.</p>
              </div>
            )}
            {decision && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-900">
                  <span className="text-slate-500 block mb-1">التحقق الطبي وموانع الصرف:</span>
                  <span className={`font-black text-sm ${decision.isSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    {decision.isSafe ? "✓ آمن وصحيح بالكامل" : "⚠ تداخل دوائي حرج!"}
                  </span>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-900">
                  <span className="text-slate-500 block mb-1">القرار التنفيذي الفوري للمخ:</span>
                  <p className="font-bold text-slate-200 text-xs leading-relaxed">{decision.proposedAction}</p>
                </div>
                {decision.alternativeSuggested && (
                  <div className="p-4 rounded-xl md:col-span-2 flex items-start gap-2 text-amber-400 border border-amber-500/10 bg-amber-500/5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">توجيه بديل آمن معتمد:</span>
                      <p>{decision.alternativeSuggested}</p>
                    </div>
                  </div>
                )}
                {decision.logisticAction && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 md:col-span-2">
                    <span className="text-slate-500 block mb-1">التوجيه اللوجستي السحابي لفروع اليمن:</span>
                    <p className="font-medium text-slate-300">
                      سيتم معالجة وتجهيز الطلب عبر: <span className="text-emerald-400 font-bold">{decision.logisticAction.targetBranch}</span> (التوصيل المقدر: {decision.logisticAction.timeMin} دقيقة).
                    </p>
                  </div>
                )}
                {decision.marketingAction && (
                  <div className="md:col-span-2 p-4 bg-fuchsia-950/20 border border-fuchsia-500/10 rounded-xl text-fuchsia-400">
                    <span className="font-bold mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" /> رعاية ترويجية وتذكير آلي للأمومة [WhatsApp Active]:
                    </span>
                    <p className="text-slate-300 italic leading-relaxed">&quot;{decision.marketingAction.message}&quot;</p>
                  </div>
                )}
                <div className="md:col-span-2 text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                  🧬 DecisionID: <span className="text-slate-400 font-mono">{decision.decisionId}</span> · ⚡ {decision.executionSpeedMs}ms · 🛠 {decision.dispatchedTools.length} أدوات
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tool Registry */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl h-fit space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-fuchsia-400" /> سجل الأدوات الثمانية
            </h3>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${activeCount > 0 ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-slate-500 border-slate-800 bg-slate-950"}`}>
              {activeCount} / 8 نشطة
            </span>
          </div>
          <div className="space-y-3">
            {REAL_TOOL_REGISTRY.map((tool, idx) => {
              const ToolIcon = tool.icon;
              const isDispatched = tool.realCodes.some((c) => dispatched.has(c));
              const baseCls = isDispatched
                ? "bg-emerald-500/10 border-emerald-500/40 sovereign-glow"
                : `${tool.tint} opacity-70 hover:opacity-100`;
              const scanCls = isLoading ? "sovereign-scan" : "";
              const scanDelay = isLoading ? { animationDelay: `${idx * 120}ms` } : undefined;
              return (
                <div
                  key={tool.code}
                  style={scanDelay}
                  className={`p-3 rounded-xl border transition duration-300 flex items-start gap-3 ${baseCls} ${scanCls}`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isDispatched ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-900 text-slate-500"}`}>
                    <ToolIcon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 text-right flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-200">{tool.name}</span>
                      {isDispatched && (
                        <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-300 rounded font-black flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          نشط الآن
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">{tool.description}</p>
                    <span className="text-[8px] text-slate-600 font-mono">{tool.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SovereignEngineDashboard;
