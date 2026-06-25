import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin-audit")({
  component: AdminAuditPage,
});

type Row = {
  source: string;
  source_id: string;
  occurred_at: string;
  details: Record<string, any>;
};

function AdminAuditPage() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs-unified"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs_unified" as any)
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return ((data ?? []) as unknown) as Row[];
    },
  });

  const sources = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((r) => s.add(r.source));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.source.toLowerCase().includes(q) ||
        r.source_id.toLowerCase().includes(q) ||
        JSON.stringify(r.details ?? {}).toLowerCase().includes(q)
      );
    });
  }, [data, sourceFilter, search]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">سجل التدقيق الموحّد</h1>
        <p className="text-sm text-zinc-400 mb-6">
          يوحّد سجلات النشاط من 5 جداول (activity, inventory, supplier, transfer, errors).
          يتطلب صلاحية مدير.
        </p>

        {error && (
          <div className="p-4 mb-4 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-200 text-sm">
            {(error as Error).message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
          >
            <option value="all">كل المصادر</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm"
          />
          <span className="px-3 py-2 text-sm text-zinc-400">
            {filtered.length} / {data?.length ?? 0}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="text-start px-3 py-2">الوقت</th>
                <th className="text-start px-3 py-2">المصدر</th>
                <th className="text-start px-3 py-2">المعرّف</th>
                <th className="text-start px-3 py-2">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-500">
                    جاري التحميل...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-500">
                    لا توجد سجلات
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={`${r.source}-${r.source_id}-${i}`} className="border-t border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                    {new Date(r.occurred_at).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-sky-950 text-sky-300 border border-sky-900">
                      {r.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 font-mono text-xs">
                    {r.source_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">
                    <details>
                      <summary className="cursor-pointer hover:text-zinc-200">عرض</summary>
                      <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] overflow-x-auto max-w-2xl">
                        {JSON.stringify(r.details, null, 2)}
                      </pre>
                    </details>
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
