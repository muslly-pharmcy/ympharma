import { Heart } from "lucide-react";

export function MaternalCarePortal() {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl space-y-6" dir="rtl">
      <div className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-300 flex items-center gap-2">
            <Heart className="w-5 h-5 text-fuchsia-400" />
            بوابة اشتراكات الأمومة والرضاعة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            نظام الاشتراكات الذكية للحوامل والأمهات: متابعة دورية، تنبيهات فحوصات، وإدارة مكملات الحديد والفوليك.
          </p>
        </div>
        <span className="px-3 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg text-[10px] font-bold border border-fuchsia-500/20">
          قيد التحضير — Beta قادم
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-1.5">
          <p className="text-slate-400">اشتراكات نشطة</p>
          <p className="text-2xl font-black text-fuchsia-400">—</p>
          <p className="text-[10px] text-slate-500">بانتظار تفعيل الخطة</p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-1.5">
          <p className="text-slate-400">مواعيد فحص الشهر</p>
          <p className="text-2xl font-black text-pink-400">—</p>
          <p className="text-[10px] text-slate-500">تكامل مع شبكة الأطباء</p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-1.5">
          <p className="text-slate-400">تنبيهات الأمان الدوائي</p>
          <p className="text-2xl font-black text-amber-400">مفعّل</p>
          <p className="text-[10px] text-slate-500">مربوط بالمخ السيادي</p>
        </div>
      </div>
    </div>
  );
}
