import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { condition: string; product_count: number; chronic_count: number; sample_image: string | null };

export function ConditionsStrip({ limit = 10 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any).rpc("conditions_catalog");
      if (!cancel) setRows(((data ?? []) as Row[]).slice(0, limit));
    })();
    return () => { cancel = true; };
  }, [limit]);

  if (!rows) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 w-28 shrink-0 animate-pulse rounded-2xl bg-secondary/60" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <Link
        to="/conditions"
        className="grid h-20 w-28 shrink-0 place-items-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-center text-xs font-bold text-primary hover:bg-primary/10"
      >
        كل الحالات →
      </Link>
      {rows.map((r) => (
        <Link
          key={r.condition}
          to="/conditions/$slug"
          params={{ slug: encodeURIComponent(r.condition) }}
          className="group flex h-20 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card p-2 text-center transition hover:border-primary hover:shadow-md"
        >
          {r.sample_image ? (
            <img src={r.sample_image} alt={r.condition} loading="lazy" className="size-8 rounded-full object-cover" />
          ) : (
            <Stethoscope className="size-6 text-emerald-600" />
          )}
          <span className="line-clamp-1 text-[11px] font-bold">{r.condition}</span>
          <span className="text-[10px] text-muted-foreground">{r.product_count}</span>
        </Link>
      ))}
    </div>
  );
}
