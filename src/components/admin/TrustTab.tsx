import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Shield } from "lucide-react";

export type TrustPage = {
  slug: string;
  title: string;
  intro: string;
  data_collection: string;
  retention: string;
  encryption: string;
  cookies: string;
  incident_reporting: string;
  contact: string;
  updated_at?: string;
};

const FIELDS: Array<{ key: keyof TrustPage; label: string; rows: number }> = [
  { key: "title", label: "العنوان الرئيسي", rows: 1 },
  { key: "intro", label: "مقدمة الصفحة", rows: 3 },
  { key: "data_collection", label: "جمع البيانات", rows: 4 },
  { key: "retention", label: "الاحتفاظ بالبيانات والحذف", rows: 4 },
  { key: "encryption", label: "التشفير وحماية البيانات", rows: 4 },
  { key: "cookies", label: "ملفات تعريف الارتباط والتخزين المحلي", rows: 3 },
  { key: "incident_reporting", label: "الإبلاغ عن مشكلة أمنية", rows: 3 },
  { key: "contact", label: "تواصل معنا", rows: 3 },
];

export function TrustTab() {
  const [page, setPage] = useState<TrustPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("trust_pages")
        .select("*")
        .eq("slug", "trust")
        .maybeSingle();
      if (error) toast.error("تعذر تحميل صفحة الأمان");
      setPage(
        (data as TrustPage | null) ?? {
          slug: "trust",
          title: "",
          intro: "",
          data_collection: "",
          retention: "",
          encryption: "",
          cookies: "",
          incident_reporting: "",
          contact: "",
        },
      );
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!page) return;
    setSaving(true);
    const { error } = await supabase
      .from("trust_pages")
      .upsert({ ...page, updated_at: new Date().toISOString() }, { onConflict: "slug" });
    setSaving(false);
    if (error) toast.error("تعذر حفظ التغييرات: " + error.message);
    else toast.success("تم حفظ صفحة الأمان والخصوصية");
  }

  if (loading || !page) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4">
        <Shield className="size-5 text-primary" />
        <div className="flex-1">
          <p className="font-black">صفحة الأمان والخصوصية (/trust)</p>
          <p className="text-xs text-muted-foreground">
            هذا المحتوى يظهر للزوار. أي تعديل يُحفظ في قاعدة البيانات ويظهر فورًا في الصفحة العامة.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ
        </button>
      </div>

      <div className="grid gap-3">
        {FIELDS.map((f) => (
          <div key={String(f.key)} className="rounded-2xl border border-border bg-card p-4">
            <label className="mb-2 block text-sm font-black text-foreground">{f.label}</label>
            {f.rows === 1 ? (
              <input
                dir="rtl"
                value={(page[f.key] as string) ?? ""}
                onChange={(e) => setPage({ ...page, [f.key]: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            ) : (
              <textarea
                dir="rtl"
                rows={f.rows}
                value={(page[f.key] as string) ?? ""}
                onChange={(e) => setPage({ ...page, [f.key]: e.target.value })}
                className="w-full resize-y rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
