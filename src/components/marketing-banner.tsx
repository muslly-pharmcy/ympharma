import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Megaphone, ChevronLeft } from "lucide-react";
import { listActiveBanners, trackBanner } from "@/lib/banners.functions";

type Banner = {
  id: string; title: string; subtitle: string | null;
  cta_label: string | null; cta_href: string | null;
  theme: string; image_url: string | null; placement: string;
};

const THEMES: Record<string, string> = {
  "gradient-emerald": "bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 text-white",
  "gradient-rose":    "bg-gradient-to-l from-rose-600 via-pink-500 to-fuchsia-500 text-white",
  "gradient-amber":   "bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 text-white",
  "gradient-indigo":  "bg-gradient-to-l from-indigo-600 via-violet-500 to-fuchsia-500 text-white",
  "solid-card":       "bg-card text-foreground ring-1 ring-border",
};

export function MarketingBanner({ placement = "home", className = "" }: { placement?: string; className?: string }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const load = useServerFn(listActiveBanners);
  const track = useServerFn(trackBanner);

  useEffect(() => {
    let alive = true;
    load({ data: { placement } }).then((rows) => { if (alive) setBanners((rows as Banner[]) ?? []); }).catch(() => {});
    return () => { alive = false; };
  }, [load, placement]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      setIdx((i) => (i + 1) % banners.length);
    }, 7000);
    return () => clearInterval(t);
  }, [banners.length]);

  useEffect(() => {
    const b = banners[idx];
    if (!b) return;
    track({ data: { id: b.id, event: "impression" } }).catch(() => {});
  }, [idx, banners, track]);

  if (banners.length === 0) return null;
  const b = banners[idx];
  const theme = THEMES[b.theme] ?? THEMES["gradient-emerald"];

  const onClick = () => { track({ data: { id: b.id, event: "click" } }).catch(() => {}); };

  return (
    <section
      className={`relative overflow-hidden rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-elevated animate-in fade-in slide-in-from-top-2 ${theme} ${className}`}
      role="region" aria-label="عرض ترويجي"
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(circle_at_top_right,white,transparent_60%)]" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Megaphone className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black sm:text-lg">{b.title}</h2>
            {b.subtitle && <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-90 sm:text-sm">{b.subtitle}</p>}
          </div>
        </div>
        {b.cta_label && b.cta_href && (
          b.cta_href.startsWith("/") ? (
            <Link to={b.cta_href as any} onClick={onClick}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-emerald-700 shadow-card transition hover:scale-[1.03]">
              {b.cta_label} <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <a href={b.cta_href} onClick={onClick}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-emerald-700 shadow-card transition hover:scale-[1.03]">
              {b.cta_label} <ChevronLeft className="size-4" />
            </a>
          )
        )}
      </div>
      {banners.length > 1 && (
        <div className="relative mt-3 flex gap-1.5">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`عرض ${i+1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
