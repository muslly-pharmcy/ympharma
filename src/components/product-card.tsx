import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { formatPrice, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-3 flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [loaded, setLoaded] = useState(false);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-elevated">
      <Link to="/product/$id" params={{ id: String(product.id) }} className="relative aspect-square overflow-hidden bg-secondary/60 block">
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`size-full object-cover transition duration-500 group-hover:scale-110 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        {product.badge && (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-black text-destructive-foreground shadow">{product.badge}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{product.name}</h3>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-black text-primary-deep">{formatPrice(product.price)} <span className="text-xs font-bold">ر.ي</span></p>
            {product.oldPrice && <p className="text-xs font-bold text-muted-foreground line-through">{formatPrice(product.oldPrice)}</p>}
          </div>
          <button
            onClick={() => { add(product.id); toast.success("تمت إضافة المنتج إلى السلة"); }}
            aria-label="أضف إلى السلة"
            className="brand-gradient grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-card transition active:scale-90 hover:scale-110"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
