// "قد يعجبك أيضاً" — personalized recommendations on the cart page.
// Calls the existing `getPersonalizedProducts` server fn (SQL-based, rate
// limited per phone). Gracefully no-ops when the phone is empty/invalid.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { getPersonalizedProducts } from "@/lib/recommendations.functions";
import { proxifyImage } from "@/lib/img-proxy";
import { handleImageError } from "@/lib/img-placeholder";
import { formatPrice } from "@/lib/products";

export function CartRecommendations({ phone }: { phone: string }) {
  const fetchRecs = useServerFn(getPersonalizedProducts);
  const trimmed = phone.trim();
  const { data, isLoading } = useQuery({
    queryKey: ["cart-recs", trimmed],
    enabled: trimmed.length >= 9,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchRecs({ data: { phone: trimmed, limit: 6 } }),
  });

  if (!trimmed || trimmed.length < 9) return null;
  if (isLoading) {
    return (
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
          <Sparkles className="size-5 text-primary" /> قد يعجبك أيضاً
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      </section>
    );
  }

  if (!data?.ok || !data.products?.length) return null;

  return (
    <section className="mt-8 animate-in fade-in slide-in-from-bottom-2">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
        <Sparkles className="size-5 text-primary" /> قد يعجبك أيضاً
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.products.map((p) => (
          <a
            key={p.id}
            href={`/product/${p.id}`}
            className="group flex flex-col rounded-2xl border border-border bg-card p-2 transition hover:shadow-card"
          >
            <img
              src={proxifyImage(p.image_url ?? "")}
              alt={p.name}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-xl object-cover"
            />
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug group-hover:text-primary">{p.name}</p>
            <p className="mt-auto pt-1 text-sm font-black text-primary-deep">{formatPrice(p.price)} ر.ي</p>
          </a>
        ))}
      </div>
    </section>
  );
}
