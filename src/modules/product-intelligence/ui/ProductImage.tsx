// Phoenix P7-A — lazy, WebP-friendly product image with placeholder fallback.
import * as React from "react";
import { ShieldCheck, ImageOff } from "lucide-react";

export interface ProductImageProps {
  src?: string | null;
  webpSrc?: string | null;
  alt: string;
  verified?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export function ProductImage({ src, webpSrc, alt, verified, width, height, className }: ProductImageProps) {
  const [errored, setErrored] = React.useState(false);
  const hasSrc = Boolean(src) && !errored;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-muted ${className ?? ""}`} style={{ width, height }}>
      {hasSrc ? (
        <picture>
          {webpSrc ? <source srcSet={webpSrc} type="image/webp" /> : null}
          <img
            src={src ?? undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            width={width}
            height={height}
            onError={() => setErrored(true)}
            className="h-full w-full object-cover"
          />
        </picture>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground" aria-label={alt}>
          <ImageOff className="size-6" aria-hidden />
        </div>
      )}
      {verified ? (
        <span
          className="absolute end-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
          title="صورة موثّقة"
        >
          <ShieldCheck className="size-3" />
          موثّقة
        </span>
      ) : null}
    </div>
  );
}
