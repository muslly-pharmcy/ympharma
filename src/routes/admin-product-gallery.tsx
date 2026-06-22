// Admin: manage gallery images per product (add URL, reorder, delete).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Images, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AdminGate } from "@/components/admin/AdminGate";
import { supabase } from "@/integrations/supabase/client";
import { proxifyImage } from "@/lib/img-proxy";
import { handleImageError } from "@/lib/img-placeholder";

export const Route = createFileRoute("/admin-product-gallery")({
  head: () => ({ meta: [{ title: "معرض صور المنتجات — الإدارة" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (<AdminGate><Page /></AdminGate>),
});

type Product = { id: string; name: string; image_url: string | null; category: string | null };
type GalleryImage = { id: string; image_url: string; alt_text: string | null; sort_order: number };

function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingImgs, setLoadingImgs] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("id, name, image_url, category").order("name");
      setProducts((data as Product[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products.slice(0, 100);
    return products.filter((p) => p.name?.toLowerCase().includes(t) || p.category?.toLowerCase().includes(t)).slice(0, 100);
  }, [products, q]);

  async function loadImages(p: Product) {
    setSelected(p);
    setLoadingImgs(true);
    const { data } = await supabase
      .from("product_gallery_images")
      .select("id, image_url, alt_text, sort_order")
      .eq("product_id", p.id)
      .order("sort_order");
    setImages((data as GalleryImage[]) ?? []);
    setLoadingImgs(false);
  }

  async function addImage() {
    if (!selected || !newUrl.trim()) return;
    setSaving(true);
    const nextOrder = (images.at(-1)?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("product_gallery_images").insert({
      product_id: selected.id, image_url: newUrl.trim(), alt_text: newAlt.trim() || null, sort_order: nextOrder,
    });
    setSaving(false);
    if (error) { toast.error("فشل الحفظ", { description: error.message }); return; }
    setNewUrl(""); setNewAlt("");
    toast.success("تمت إضافة الصورة");
    loadImages(selected);
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const a = images[idx], b = images[target];
    await supabase.from("product_gallery_images").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("product_gallery_images").update({ sort_order: a.sort_order }).eq("id", b.id);
    if (selected) loadImages(selected);
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه الصورة؟")) return;
    const { error } = await supabase.from("product_gallery_images").delete().eq("id", id);
    if (error) { toast.error("فشل الحذف", { description: error.message }); return; }
    toast.success("تم الحذف");
    if (selected) loadImages(selected);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Images className="size-7 text-primary" /> إدارة معرض صور المنتجات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">أضف صوراً متعددة لكل منتج وحدد ترتيب عرضها في صفحة المنتج.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Products list */}
          <section className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-2xl border border-border bg-secondary/60 ps-4 pe-10 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => loadImages(p)} className={`flex w-full items-center gap-3 border-b border-border p-2 text-start hover:bg-secondary/60 ${selected?.id === p.id ? "bg-primary/10" : ""}`}>
                  <img src={proxifyImage(p.image_url ?? "")} onError={handleImageError} alt="" className="size-10 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.category}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">لا توجد نتائج</p>}
            </div>
          </section>

          {/* Editor */}
          <section className="space-y-4">
            {!selected ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-12 text-sm text-muted-foreground">
                اختر منتجاً من القائمة لإدارة صوره
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-sm font-black">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.category}</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-black">إضافة صورة جديدة</h3>
                  <div className="space-y-2">
                    <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="رابط الصورة (https://...)" className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm outline-none focus:border-primary" />
                    <input value={newAlt} onChange={(e) => setNewAlt(e.target.value)} placeholder="وصف الصورة (اختياري)" className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm outline-none focus:border-primary" />
                    <button onClick={addImage} disabled={saving || !newUrl.trim()} className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} إضافة
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-black">الصور الحالية ({images.length})</h3>
                  {loadingImgs ? (
                    <div className="grid place-items-center py-6"><Loader2 className="size-5 animate-spin text-primary" /></div>
                  ) : images.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد صور — أضف الصورة الأولى أعلاه</p>
                  ) : (
                    <ul className="space-y-2">
                      {images.map((img, i) => (
                        <li key={img.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-xs font-black">{i + 1}</span>
                          <img src={proxifyImage(img.image_url)} onError={handleImageError} alt={img.alt_text ?? ""} className="size-14 rounded object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-muted-foreground">{img.alt_text || "—"}</p>
                            <p className="truncate text-[10px] text-muted-foreground/70">{img.image_url}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="أعلى"><ArrowUp className="size-4" /></button>
                            <button onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="أسفل"><ArrowDown className="size-4" /></button>
                            <button onClick={() => remove(img.id)} className="rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" aria-label="حذف"><Trash2 className="size-4" /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
