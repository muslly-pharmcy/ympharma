// Lightweight multi-image product gallery with click-to-zoom modal.
// Falls back to the single product image when no gallery rows exist.
import { useEffect, useState } from "react";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { proxifyImage } from "@/lib/img-proxy";
import { handleImageError } from "@/lib/img-placeholder";

type GalleryImage = { id: string; image_url: string; alt_text: string | null };

export function ProductGallery({ productLegacyId, fallbackImage, productName }: {
  productLegacyId?: number;
  fallbackImage: string;
  productName: string;
}) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    let alive = true;
    if (!productLegacyId) return;
    (async () => {
      const { data: prod } = await supabase
        .from("products").select("id").eq("legacy_id", productLegacyId).maybeSingle();
      if (!prod?.id || !alive) return;
      const { data } = await supabase
        .from("product_gallery_images")
        .select("id, image_url, alt_text")
        .eq("product_id", prod.id)
        .order("sort_order", { ascending: true });
      if (alive && data) setImages(data as GalleryImage[]);
    })();
    return () => { alive = false; };
  }, [productLegacyId]);

  const gallery: GalleryImage[] = images.length > 0
    ? images
    : [{ id: "fallback", image_url: fallbackImage, alt_text: productName }];
  const current = gallery[active] ?? gallery[0];

  // Close on Escape
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + gallery.length) % gallery.length);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % gallery.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, gallery.length]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => { setZoomScale(1); setZoom(true); }}
        className="group relative block w-full overflow-hidden rounded-3xl border border-border bg-card"
        aria-label="تكبير الصورة"
      >
        <img
          src={proxifyImage(current.image_url)}
          alt={current.alt_text ?? productName}
          onError={handleImageError}
          className="aspect-square w-full object-cover transition group-hover:scale-105"
        />
        <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
          <ZoomIn className="size-3.5" /> تكبير
        </span>
      </button>

      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${i === active ? "border-primary" : "border-border opacity-70 hover:opacity-100"}`}
              aria-label={`صورة ${i + 1}`}
            >
              <img
                src={proxifyImage(img.image_url)}
                alt={img.alt_text ?? `${productName} ${i + 1}`}
                onError={handleImageError}
                className="size-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-xs font-bold opacity-80">{active + 1} / {gallery.length}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoomScale((s) => Math.max(1, s - 0.25))} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">−</button>
              <span className="min-w-[3rem] text-center text-xs font-bold">{Math.round(zoomScale * 100)}%</span>
              <button onClick={() => setZoomScale((s) => Math.min(4, s + 0.25))} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20">+</button>
              <button onClick={() => setZoom(false)} className="ms-2 rounded-lg bg-white/10 p-2 hover:bg-white/20" aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            <img
              src={proxifyImage(current.image_url)}
              alt={current.alt_text ?? productName}
              onError={handleImageError}
              style={{ transform: `scale(${zoomScale})`, transition: "transform 0.2s" }}
              className="max-h-full max-w-full origin-center cursor-zoom-in object-contain"
              onClick={() => setZoomScale((s) => (s >= 3 ? 1 : s + 0.5))}
            />
            {gallery.length > 1 && (
              <>
                <button onClick={() => { setActive((i) => (i - 1 + gallery.length) % gallery.length); setZoomScale(1); }} className="absolute start-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="السابق">
                  <ChevronRight className="size-6" />
                </button>
                <button onClick={() => { setActive((i) => (i + 1) % gallery.length); setZoomScale(1); }} className="absolute end-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="التالي">
                  <ChevronLeft className="size-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
