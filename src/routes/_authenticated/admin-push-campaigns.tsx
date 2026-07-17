import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listPushCampaigns,
  createPushCampaign,
  togglePushCampaign,
  pushCampaignStats,
} from "@/lib/push-campaigns.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin-push-campaigns")({
  head: () => ({
    meta: [
      { title: "حملات الإشعارات — المصلي" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <PushCampaignsPage />
    </AdminGate>
  ),
});

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  active: boolean;
  created_at: string;
};

type Stats = {
  activeSubscribers: number;
  sent7d: number;
  clicked7d: number;
  ctr7d: number;
};

function PushCampaignsPage() {
  const list = useServerFn(listPushCampaigns);
  const create = useServerFn(createPushCampaign);
  const toggle = useServerFn(togglePushCampaign);
  const stats = useServerFn(pushCampaignStats);

  const [rows, setRows] = useState<Campaign[]>([]);
  const [s, setS] = useState<Stats | null>(null);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<"daily" | "72_hours" | "weekly">("72_hours");

  const refresh = useCallback(async () => {
    const [r, st] = await Promise.all([list({}), stats({})]);
    setRows(r.campaigns as Campaign[]);
    setS(st);
  }, [list, stats]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 p-6 text-teal-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">حملات الإشعارات</h1>
          <Link to="/admin-hub" className="text-sm text-teal-400 hover:underline">
            ← لوحة الأدمن
          </Link>
        </div>

        {s && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card label="مشتركون نشطون" value={s.activeSubscribers} />
            <Card label="مُرسل (7 أيام)" value={s.sent7d} />
            <Card label="نقرات (7 أيام)" value={s.clicked7d} />
            <Card label="CTR" value={`${s.ctr7d.toFixed(1)}%`} />
          </div>
        )}

        <div className="rounded-xl border border-teal-900/60 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold">إنشاء حملة جديدة</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-teal-300">الاسم</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-teal-900 bg-slate-950 px-3 py-2 text-sm"
                placeholder="مثال: نصائح صحية أسبوعية"
              />
            </div>
            <div>
              <label className="text-xs text-teal-300">التكرار</label>
              <select
                value={freq}
                onChange={(e) => setFreq(e.target.value as typeof freq)}
                className="mt-1 rounded-lg border border-teal-900 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="daily">يومي</option>
                <option value="72_hours">كل 72 ساعة</option>
                <option value="weekly">أسبوعي</option>
              </select>
            </div>
            <button
              onClick={async () => {
                if (!name.trim()) return;
                try {
                  await create({ data: { name, frequency: freq, content_type: "medical_tip" } });
                  setName("");
                  toast.success("تم إنشاء الحملة");
                  refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "خطأ");
                }
              }}
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
            >
              إنشاء
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-teal-900/60 bg-slate-900/60">
          <table className="w-full text-sm">
            <thead className="border-b border-teal-900/60 text-teal-300">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3">التكرار</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-teal-400">
                    لا توجد حملات بعد
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-teal-900/40">
                  <td className="p-3 text-right">{c.name}</td>
                  <td className="p-3 text-center">{c.frequency}</td>
                  <td className="p-3 text-center">
                    <span className={c.active ? "text-emerald-400" : "text-slate-500"}>
                      {c.active ? "نشطة" : "متوقفة"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={async () => {
                        await toggle({ data: { id: c.id, active: !c.active } });
                        refresh();
                      }}
                      className="rounded-md border border-teal-800 px-3 py-1 text-xs hover:bg-teal-950"
                    >
                      {c.active ? "إيقاف" : "تشغيل"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-teal-900/60 bg-slate-900/60 p-4">
      <div className="text-xs text-teal-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-teal-100">{value}</div>
    </div>
  );
}
