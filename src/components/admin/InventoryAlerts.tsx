import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { getLowStockProducts } from "@/lib/inventory.functions";

export function InventoryAlerts() {
  const fetchLow = useServerFn(getLowStockProducts);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => fetchLow(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#e8e6e1] bg-white p-6 flex items-center gap-3 text-[#666]">
        <Loader2 className="w-4 h-4 animate-spin" />
        جاري فحص المخزون...
      </div>
    );
  }

  const items = data?.lowStock ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
        <div>
          <div className="font-semibold text-emerald-900">المخزون كافٍ</div>
          <div className="text-sm text-emerald-700">لا توجد منتجات تحت الحد الأدنى حالياً.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60">
      <div className="flex items-center justify-between p-4 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div>
            <div className="font-semibold text-amber-900">تنبيهات المخزون المنخفض</div>
            <div className="text-xs text-amber-700">{items.length} منتج بحاجة إلى إعادة توريد</div>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>
      <ul className="divide-y divide-amber-100">
        {items.map((p: any) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#2b2b2b] truncate">{p.name}</div>
              <div className="text-xs text-[#666]">
                المخزون: <span className="font-mono">{p.stock_qty ?? 0}</span>
                <span className="mx-1">·</span>
                الحد الأدنى: <span className="font-mono">{p.reorder_point ?? 0}</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-600 text-white">
              عاجل
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
