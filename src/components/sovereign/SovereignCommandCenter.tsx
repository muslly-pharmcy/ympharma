import { useState } from "react";
import {
  Brain, Heart, Zap, Users, Cpu, Flame, Thermometer, Activity,
  Baby, Leaf, AlertCircle,
} from "lucide-react";
import { SovereignEngineDashboard } from "@/modules/ai-brain/components/SovereignEngineDashboard";

export type SovereignTab =
  | "brain" | "fevers" | "chronic" | "maternal"
  | "kids" | "doctors" | "supplements" | "herbs";

export const SOVEREIGN_TABS: SovereignTab[] = [
  "brain", "fevers", "chronic", "maternal", "kids", "doctors", "supplements", "herbs",
];

export function SovereignCommandCenter({ initialTab = "brain" }: { initialTab?: SovereignTab }) {
  const [activeTab, setActiveTab] = useState<SovereignTab>(initialTab);

  const [weight, setWeight] = useState<number>(70);
  const [feverType, setFeverType] = useState<string>("dengue");
  const [caloricResult, setCaloricResult] = useState<number>(2100);
  const calculateCaloricNeeds = () => {
    const bmr = weight * 24;
    const mult = feverType === "malaria" ? 1.3 : feverType === "dengue" ? 1.25 : 1.15;
    setCaloricResult(Math.round(bmr * mult));
  };

  const [childWeight, setChildWeight] = useState<number>(10);
  const [paracetamolDose, setParacetamolDose] = useState<string>("100-150 ملغ (تقريباً 5.2 مل شراب)");
  const calculateChildDose = (w: number) => {
    setChildWeight(w);
    const minDose = w * 10;
    const maxDose = w * 15;
    const mlDose = ((minDose + maxDose) / 2) * (5 / 120);
    setParacetamolDose(`${minDose}-${maxDose} ملغ (تقريباً ${mlDose.toFixed(1)} مل شراب)`);
  };

  // Solar system palette — olive #005D4F core, planet accent per tab
  const OLIVE = "#005D4F";
  const PLANETS: Record<SovereignTab, { label: string; icon: React.ReactNode; from: string; to: string }> = {
    brain:       { label: "المخ السيادي والـ 800 أداة",     icon: <Cpu className="w-4 h-4" />,        from: "#F5D76E", to: "#B8860B" },
    fevers:      { label: "الحميات والسعرات والتطبيبات",   icon: <Flame className="w-4 h-4" />,      from: "#FF6B6B", to: "#8B0000" },
    chronic:     { label: "قسم المريض المزمن",              icon: <Activity className="w-4 h-4" />,   from: "#F5A623", to: "#7C4A00" },
    maternal:    { label: "قسم الأمهات ورعاية الحوامل",    icon: <Heart className="w-4 h-4" />,      from: "#F78DA7", to: "#8B1A4A" },
    kids:        { label: "قسم الأطفال والرضع",             icon: <Baby className="w-4 h-4" />,       from: "#67B7F7", to: "#0B3D66" },
    doctors:     { label: "شبكة الأطباء والعيادات",         icon: <Users className="w-4 h-4" />,      from: "#7ED6DF", to: "#005B6E" },
    supplements: { label: "المكملات الغذائية والفيتامينات", icon: <Zap className="w-4 h-4" />,        from: "#F9E79F", to: "#7D6608" },
    herbs:       { label: "الأعشاب الطبية والطب البديل",   icon: <Leaf className="w-4 h-4" />,       from: "#A8E063", to: "#1E5B1E" },
  };

  const [navFilter, setNavFilter] = useState("");
  const filteredTabs = SOVEREIGN_TABS.filter((t) =>
    !navFilter.trim() || PLANETS[t].label.includes(navFilter.trim()),
  );

  const tabBtn = (tab: SovereignTab) => {
    const active = activeTab === tab;
    const p = PLANETS[tab];
    return (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className="group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
        style={
          active
            ? { background: "rgba(0,93,79,0.28)", border: "1px solid rgba(212,175,55,0.45)", color: "#F5E6A8", boxShadow: "0 0 24px rgba(0,93,79,0.35)" }
            : { color: "#9CB3AE", border: "1px solid transparent" }
        }
      >
        <span className="flex items-center gap-2.5">
          {/* Planet orb */}
          <span
            className="relative inline-flex w-6 h-6 items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-110"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${p.from}, ${p.to})`,
              boxShadow: active ? `0 0 12px ${p.from}` : `0 0 6px rgba(0,0,0,0.4)`,
            }}
          >
            <span className="text-white/90">{p.icon}</span>
            {active && (
              <span
                className="absolute inset-0 rounded-full border animate-ping"
                style={{ borderColor: p.from, opacity: 0.4 }}
              />
            )}
          </span>
          <span>{p.label}</span>
        </span>
        {active && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: p.from }} />}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen font-sans" dir="rtl"
      style={{
        background: "radial-gradient(ellipse at top left, #002B24 0%, #050b0a 55%, #000 100%)",
        color: "#E6EFEC",
      }}
    >
      <aside
        className="w-72 flex flex-col justify-between p-4 z-20 shrink-0 backdrop-blur-xl"
        style={{
          background: "linear-gradient(180deg, rgba(0,93,79,0.18) 0%, rgba(0,20,17,0.85) 100%)",
          borderLeft: `1px solid ${OLIVE}55`,
        }}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-2 py-3" style={{ borderBottom: `1px solid ${OLIVE}44` }}>
            <div
              className="p-2 rounded-xl text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${OLIVE}, #D4AF37)` }}
            >
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide"
                style={{ color: "#F5E6A8", textShadow: `0 0 12px ${OLIVE}` }}>
                Al-Musalli AI-OS
              </h2>
              <p className="text-[9px]" style={{ color: "#8FA8A3" }}>المجموعة الشمسية السيادية</p>
            </div>
          </div>

          <div className="relative">
            <input
              value={navFilter}
              onChange={(e) => setNavFilter(e.target.value)}
              placeholder="ابحث في الكواكب…"
              className="w-full text-xs px-3 py-2 rounded-lg outline-none placeholder:text-slate-500"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${OLIVE}66`,
                color: "#E6EFEC",
              }}
            />
          </div>

          <nav className="space-y-1 overflow-y-auto max-h-[65vh] pr-1">
            {filteredTabs.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-4">لا كوكب مطابق</p>
            ) : (
              filteredTabs.map((t) => tabBtn(t))
            )}
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <span>إصدار النظام: 5.2 Enterprise</span>
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        {activeTab === "brain" && <SovereignEngineDashboard />}

        {activeTab === "fevers" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300 flex items-center gap-2">
                  <Thermometer className="w-6 h-6 text-rose-500" /> قسم الحميات والاحتياجات الغذائية والتطبيبات
                </h2>
                <p className="text-xs text-slate-400 mt-1">حساب السعرات التلقائي للمرضى المصابين بالحمى في اليمن مع بروتوكولات الطبابة المعتمدة.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 space-y-4">
                <h3 className="text-xs font-bold text-rose-400">حاسبة السعرات للمصابين بالحمى</h3>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">الوزن الحالي (كجم):</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نوع الحمى النشطة:</label>
                  <select value={feverType} onChange={(e) => setFeverType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200">
                    <option value="dengue">حمى الضنك (موجة الصيف في عدن والحديدة)</option>
                    <option value="malaria">الملاريا (بحاجة لسعرات عالية)</option>
                    <option value="typhoid">التيفوئيد (تتطلب غذاء ناعم وخفيف)</option>
                  </select>
                </div>
                <button onClick={calculateCaloricNeeds}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition">
                  احسب السعرات المطلوبة
                </button>
                <div className="p-3 bg-slate-950 border border-rose-500/10 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500">السعرات اليومية المقترحة للتعافي:</p>
                  <p className="text-lg font-black text-rose-400">{caloricResult} سعرة حرارية</p>
                </div>
              </div>
              <div className="lg:col-span-2 bg-slate-900/20 p-5 rounded-2xl border border-slate-900 space-y-4">
                <h3 className="text-xs font-bold text-slate-300">نظام التطبيبات والبروتوكول العلاجي المعتمد</h3>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                    <span className="font-bold text-rose-400 block mb-1">🏥 بروتوكول حمى الضنك (Dengue Fever):</span>
                    <p>المخ يوجه بعدم صرف الأسبرين أو البروفين نهائياً لتجنب حدوث النزيف. يوصى بالباراسيتامول فقط مع تناول السوائل بكثافة (عصير الجوافة الطبيعي، ومحاليل الإرواء، وحساء الخضار).</p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                    <span className="font-bold text-orange-400 block mb-1">🍃 التطبيبات المنزلية والتقليدية لليمن:</span>
                    <p>تناول مغلي الشعير الدافئ لتطهير الكلى وتخفيض حرارة الجسم الداعمة، واستخدام الكمادات الباردة على الرقبة وتحت الإبطين وتجنب وضعها مباشرة على الجبين.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chronic" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-amber-500" /> قسم المريض المزمن والرعاية المستمرة
                </h2>
                <p className="text-xs text-slate-400 mt-1">تأمين جرعات مرضى السكري، الضغط، والقلب في اليمن بجدولة تكرار الصرف التلقائي.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-amber-400 text-sm block">🩸 رعاية مرضى السكري (Diabetes Panel)</span>
                <p className="text-slate-400 leading-relaxed">جدولة وحفظ جرعات الإنسولين وحبوب الميتفورمين للعملاء مع التنبيه الفوري قبل نفاذ الأدوية بـ 5 أيام لضمان عدم حدوث صدمات سكر.</p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-rose-400 text-sm block">❤️ رعاية مرضى الضغط والقلب (Hypertension)</span>
                <p className="text-slate-400 leading-relaxed">فحص تفاعل أدوية الضغط المزمنة (مثل حاصرات بيتا ومثبطات ACE) مع مسكنات الألم الشائعة للتأكد من سلامة الصرف الدائم.</p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-400 text-sm block">📦 التوصيل المجاني الدوري للمزمنين</span>
                <p className="text-slate-400 leading-relaxed">صيدلية المصلي تؤمن إرسال العلاج الشهري لباب منزلك في المنصورة، كريتر، أو الشيخ عثمان مع فحص دوري مجاني للضغط والسكري.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "maternal" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-300 flex items-center gap-2">
                  <Heart className="w-6 h-6 text-fuchsia-500" /> قسم رعاية الأمهات واشتراكات الحمل
                </h2>
                <p className="text-xs text-slate-400 mt-1">جدول الرعاية الوقائية للحوامل، الفيتامينات الضرورية، وباقات تغذية الأطفال والرضع.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-3">
                <h3 className="font-bold text-fuchsia-400 text-sm">مراحل دعم الحمل وفيتامينات النمو</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="font-bold text-slate-200">الأشهر الثلاثة الأولى (1-3):</span>
                    <p className="text-slate-400 mt-1">التركيز على حمض الفوليك (Folic Acid 400mcg) لحماية الجنين من عيوب الأنبوب العصبي، ومكملات الحديد الخفيفة.</p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                    <span className="font-bold text-slate-200">الأشهر الوسطى والأخيرة (4-9):</span>
                    <p className="text-slate-400 mt-1">تأمين مكملات الكالسيوم لحفظ عظام الأم وبناء عظام الجنين، وحبوب الأوميغا 3 لدعم تطوير مخ وشبكية عين الطفل.</p>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-fuchsia-400 text-sm">باقة الأمومة والرضع الشاملة بالواتساب</h3>
                  <p className="text-slate-300 leading-relaxed mt-2">
                    نظام تتبع ذكي يراقب استهلاك طفلك للحليب والحفاضات ويجهز الطلب دورياً للبيت تلقائياً مع إشعار تذكير لطيف للأم على الواتساب قبل النفاذ بثلاثة أيام، لتبقي مرتاحة البال والوجدان بالكامل.
                  </p>
                </div>
                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl">
                  <p className="text-fuchsia-400 font-bold">✓ ميزة حصرية:</p>
                  <p className="text-slate-400 mt-1">حسم خاص بنسبة 10% لجميع الأمهات المسجلات في برنامج رعاية المصلي للطفولة في عدن وصنعاء.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "kids" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 flex items-center gap-2">
                  <Baby className="w-6 h-6 text-blue-500" /> قسم طبابة الأطفال وجرعات الرضع الآمنة
                </h2>
                <p className="text-xs text-slate-400 mt-1">حساب تلقائي لجرعات أدوية الأطفال وخافضات الحرارة حسب الوزن بدقة متناهية لمنع الأخطاء السمية.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 space-y-4">
                <h3 className="text-xs font-bold text-blue-400">حاسبة جرعات الأطفال خافضة الحرارة</h3>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">وزن الطفل الحالي (كجم):</label>
                  <input type="number" value={childWeight}
                    onChange={(e) => calculateChildDose(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200" />
                </div>
                <div className="p-3 bg-slate-950 border border-blue-500/10 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500">الجرعة المناسبة للباراسيتامول:</p>
                  <p className="text-base font-black text-blue-400 mt-1">{paracetamolDose}</p>
                </div>
              </div>
              <div className="lg:col-span-2 bg-slate-900/20 p-5 rounded-2xl border border-slate-900 space-y-4 text-xs leading-relaxed">
                <h3 className="text-xs font-bold text-slate-300">ملاحظات الأمان الوقائي لجرعات الأطفال</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-slate-300">لا تعطي طفلك الإيبوبروفين (أدول/بروفين) إذا كان يعاني من القيء المستمر أو الجفاف أو اشتباه حمى الضنك، لتفادي إتلاف الكلى أو حدوث نزيف داخلي.</p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-slate-300">يجب تباعد جرعات الباراسيتامول (الخافض) بمقدار 4 إلى 6 ساعات على الأقل، وعدم تجاوز 4 جرعات خلال 24 ساعة حمايةً لكبد الرضيع من التلف التسممي.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "doctors" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-300 flex items-center gap-2">
                  <Users className="w-6 h-6 text-sky-500" /> شبكة الأطباء الشركاء والتحويل السريع
                </h2>
                <p className="text-xs text-slate-400 mt-1">تنسيق التحويلات الطبية، والتحقق من التخصصات الدقيقة للأطباء المعتمدين في عدن وصنعاء.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-200">د. سلطان بن علي الخالدي</h4>
                  <p className="text-sky-400">استشاري أمراض الأطفال والرضع</p>
                  <p className="text-[10px] text-slate-500">العيادة: مستشفى الصداقة - الشيخ عثمان، عدن</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded text-[9px] font-black">موثق</span>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-200">د. سحر محمد أحمد</h4>
                  <p className="text-sky-400">أخصائية أمراض النساء والتوليد والعقم</p>
                  <p className="text-[10px] text-slate-500">العيادة: مستشفى بابل - كريتر، عدن</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded text-[9px] font-black">موثق</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "supplements" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-500" /> قسم المكملات الغذائية والفيتامينات وحزم الرياضيين
                </h2>
                <p className="text-xs text-slate-400 mt-1">دليل علمي لفوائد المكملات وجرعات الفيتامينات اليومية لتقوية المناعة ومستويات الطاقة.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-yellow-400 text-sm block">🌟 فيتامين د3 وتثبيت الكالسيوم</span>
                <p className="text-slate-400">هام جداً لتقوية العظام والمناعة ومحاربة الكسل الصباحي والوهن الدائم. الجرعة القياسية اليومية للبالغين هي 1000-2000 وحدة دولية بعد وجبة تحتوي على دهون صحية.</p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-orange-400 text-sm block">⚡ مكملات أوميغا 3 وزيت السمك</span>
                <p className="text-slate-400">مكمل جوهري لتعزيز صحة القلب والشرايين وخفض مستويات الدهون الثلاثية بالدم، ورفع درجة التركيز والحفظ الذهني للطلاب والباحثين.</p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-400 text-sm block">💪 حزم الزنك وفيتامين ج للمناعة</span>
                <p className="text-slate-400">حزم متخصصة لمواجهة تقلبات الطقس والإنفلونزا في اليمن، تساعد في تقصير فترة المرض وتسريع التئام الجروح وتقوية بصيلات الشعر.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "herbs" && (
          <div className="max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 flex items-center gap-2">
                  <Leaf className="w-6 h-6 text-emerald-500 animate-pulse" /> قسم الأعشاب الطبية والبدائل الطبيعية الآمنة
                </h2>
                <p className="text-xs text-slate-400 mt-1">دليل التداوي بالأعشاب الطبيعية والبدائل العشبية الآمنة لتعزيز صحة جهاز الهضم والجسم.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-400 text-sm block">🌿 الزنجبيل والليمون للالتهاب والمغص</span>
                <p className="text-slate-300">بديل طبيعي ممتاز لتخفيف آلام وتشنجات المعدة، وتهدئة التهابات الحلق والشعب الهوائية، ويساعد بفاعلية في تقليل الشعور بالغثيان لدى الحوامل.</p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-teal-400 text-sm block">🌱 البابونج البري والنعناع للمغص والهدوء</span>
                <p className="text-slate-300">مشروب دافئ رائع لتهدئة القولون العصبي وتشنجات الأمعاء، ويساعد بامتياز على الاسترخاء والحد من مستويات التوتر والقلق لنوم هادئ وعميق.</p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-2">
                <span className="font-bold text-green-400 text-sm block">🌳 الحبة السوداء والعسل لتقوية المناعة</span>
                <p className="text-slate-300">بروتوكول وقائي يمني شهير. ملعقة صغيرة من عسل السدر الطبيعي مع حبات سوداء مطحونة صباحاً تعمل كمضاد أكسدة قوي لتعزيز الدفاعات الطبيعية للجسم.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
