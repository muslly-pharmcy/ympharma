import React, { useState } from "react";
import { Cpu, Sparkles, RotateCw, Play, ShieldAlert, ShieldCheck, MapPin, Wrench } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { executeNeuralInference } from "../functions/brain.functions";
import type { BrainDecisionMatrix } from "../domain/types";
import { TOOL_REGISTRY } from "../services/SuperBrainSovereign";

const DISTRICTS = ["عدن", "صنعاء", "تعز", "المكلا", "الحديدة"] as const;

type Chronic = "diabetes" | "hypertension" | "pregnancy";
const CHRONIC_LABEL: Record<Chronic, string> = {
  diabetes: "سكري",
  hypertension: "ضغط",
  pregnancy: "حامل",
};

export const SovereignEngineDashboard: React.FC = () => {
  const runInference = useServerFn(executeNeuralInference);
  const [district, setDistrict] = useState<string>("عدن");
  const [userInput, setUserInput] = useState<string>("أريد حليب أطفال ومسكن آمن لمرضى الضغط");
  const [conditions, setConditions] = useState<Chronic[]>(["hypertension"]);
  const [decision, setDecision] = useState<BrainDecisionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCondition = (c: Chronic) =>
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    setDecision(null);
    try {
      const chronic = conditions.filter((c) => c !== "pregnancy");
      const pregnant = conditions.includes("pregnancy");
      const data = await runInference({
        data: {
          userInput,
          district,
          patient: {
            chronicConditions: chronic,
            pregnant,
          },
        },
      });
      setDecision(data);
    } catch (err) {
      setError((err as Error).message ?? "فشل تشغيل النواة السيادية");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="max-w-6xl mx-auto p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl font-sans"
      dir="rtl"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-fuchsia-400">
            النواة السيادية للمخ الإدراكي
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            محرك قرارات موصول بقاعدة البيانات الفعلية: سلامة دوائية، توجيه جغرافي، واقتراح حملات — مع تسجيل كامل في سجل الأعصاب.
          </p>
        </div>
        <button
          onClick={handleStart}
          disabled={isLoading || !userInput.trim()}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs transition flex items-center gap-2"
        >
          {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isLoading ? "جاري الاستنتاج..." : "إطلاق المخ السيادي"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inputs */}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 h-fit">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" /> معطيات الاستدعاء
          </h3>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">المديرية</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">الطلب / الاستفسار</label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              maxLength={2000}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 h-24 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">حالات مزمنة للمريض</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHRONIC_LABEL) as Chronic[]).map((c) => {
                const active = conditions.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCondition(c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                      active
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {CHRONIC_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-900">
            <p className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
              <Wrench className="w-3 h-3" /> سجل الأدوات المتاحة ({TOOL_REGISTRY.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {TOOL_REGISTRY.map((t) => (
                <span
                  key={t.code}
                  title={`${t.name} • ${t.accuracyRate}%`}
                  className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-500 rounded text-[9px] font-mono"
                >
                  {t.code}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 p-6 rounded-2xl flex flex-col min-h-[300px]">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-fuchsia-400" /> مصفوفة القرار
          </h3>

          {isLoading && (
            <div className="text-center py-16 text-slate-500 animate-pulse text-xs">
              <RotateCw className="w-10 h-10 text-emerald-400 mx-auto mb-3 animate-spin" />
              <p>جاري تشغيل الأدوات وفحص السلامة والتوجيه الجغرافي...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
              خطأ: {error}
            </div>
          )}

          {!isLoading && !error && !decision && (
            <div className="text-center py-16 text-slate-500 text-xs">
              <Cpu className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>اضغط على «إطلاق المخ السيادي» لبدء الاستنتاج.</p>
            </div>
          )}

          {decision && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900">
                <span className="text-slate-400 block mb-1">حالة السلامة</span>
                <span className={`font-black text-sm flex items-center gap-1 ${decision.isSafe ? "text-emerald-400" : "text-rose-400"}`}>
                  {decision.isSafe ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {decision.isSafe ? "آمن" : "تداخل / خطر محتمل"}
                </span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900">
                <span className="text-slate-400 block mb-1">الإجراء المقترح</span>
                <p className="font-bold text-slate-200 text-xs leading-relaxed">{decision.proposedAction}</p>
              </div>

              {decision.alternativeSuggested && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 md:col-span-2">
                  <span className="text-slate-400 block mb-1">بديل مقترح</span>
                  <span className="font-bold text-emerald-400 text-xs">{decision.alternativeSuggested}</span>
                </div>
              )}

              {decision.logisticAction && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 md:col-span-2">
                  <span className="text-slate-400 block mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> التوجيه اللوجستي
                  </span>
                  <p className="font-bold text-slate-200">
                    <span className="text-emerald-400">{decision.logisticAction.targetBranch}</span>
                    {decision.logisticAction.distanceKm != null && (
                      <span className="text-slate-400"> • {decision.logisticAction.distanceKm.toFixed(1)} كم</span>
                    )}
                    <span className="text-slate-400"> • ETA {decision.logisticAction.timeMin} دقيقة</span>
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 md:col-span-2">
                <span className="text-slate-400 block mb-1">الأدوات المُفعّلة</span>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {decision.dispatchedTools.map((tool, idx) => (
                    <span
                      key={`${tool}-${idx}`}
                      className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded text-[9px] font-mono"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>معرّف القرار: <span className="font-mono text-slate-400">{decision.decisionId}</span></span>
                  <span>زمن التنفيذ: {decision.executionSpeedMs} ms</span>
                </div>
              </div>

              {decision.marketingAction && (
                <div className="md:col-span-2 p-4 bg-fuchsia-950/20 border border-fuchsia-500/10 rounded-xl">
                  <span className="font-bold mb-1.5 flex items-center gap-1 text-fuchsia-400">
                    <Sparkles className="w-4 h-4" /> اقتراح حملة (لم تُرسَل)
                  </span>
                  <p className="text-slate-300 italic leading-relaxed">&quot;{decision.marketingAction.message}&quot;</p>
                  <p className="text-[10px] text-fuchsia-500/70 mt-2">القناة المقترحة: {decision.marketingAction.channel}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SovereignEngineDashboard;
