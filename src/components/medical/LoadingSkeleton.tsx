import { cn } from "@/lib/utils";

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("medical-shimmer h-3 w-full rounded-md", className)} aria-hidden />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <div className={cn("medical-shimmer size-12 shrink-0 rounded-2xl", className)} aria-hidden />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("medical-card p-4", className)} aria-hidden>
      <div className="flex items-start gap-3">
        <SkeletonAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/2" />
          <SkeletonLine className="w-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
