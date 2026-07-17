import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pill, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "دليل الأدوية — MUSLLY" },
      { name: "description", content: "قاعدة معرفية للأدوية باللغة العربية: الاستخدامات، الفئات العلاجية، والبدائل. مصدر معلومات موثوق للمرضى وطلاب الصيدلة." },
      { property: "og:title", content: "دليل الأدوية — MUSLLY" },
      { property: "og:description", content: "قاعدة معرفية للأدوية باللغة العربية." },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/medicines" }],
  }),
  component: MedicinesIndex,
});

function MedicinesIndex() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["medicines-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_entities")
        .select("id, slug, name_ar, name_en, description_ar, atc_code")
        .eq("entity_type", "MEDICINE")
        .order("name_ar")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((m) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (
      m.name_ar?.toLowerCase().includes(s) ||
      m.name_en?.toLowerCase().includes(s) ||
      m.atc_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <ChevronRight className="size-3 rotate-180" />
          <span className="text-foreground">الأدوية</span>
        </nav>

        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-black">دليل الأدوية</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "جارٍ التحميل…" : `${filtered.length} دواء في قاعدة المعرفة`}
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الدواء أو المادة الفعالة أو رمز ATC…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.id}
              to="/medicines/$slug"
              params={{ slug: m.slug }}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Pill className="size-5" />
                </div>
                {m.atc_code && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {m.atc_code}
                  </span>
                )}
              </div>
              <div className="text-base font-bold group-hover:text-primary">{m.name_ar}</div>
              <div className="text-xs text-muted-foreground">{m.name_en}</div>
              {m.description_ar && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{m.description_ar}</p>
              )}
            </Link>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            لا توجد نتائج مطابقة لبحثك.
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
