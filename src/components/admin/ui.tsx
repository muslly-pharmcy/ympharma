import { Loader2, AlertCircle, RefreshCw, Search, ChevronRight, ChevronLeft } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/60 ${className}`} />;
}

export function RxCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

export function TabState({ loading, error, empty, onRetry, skeleton, children }: {
  loading?: boolean; error?: string | null; empty?: boolean;
  onRetry?: () => void; skeleton?: React.ReactNode; children: React.ReactNode;
}) {
  if (loading) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">جارٍ التحميل...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid place-items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 py-12 text-center">
        <AlertCircle className="size-8 text-rose-500" />
        <div>
          <p className="text-sm font-black text-rose-700">تعذر تحميل البيانات</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-600">
            <RefreshCw className="size-3.5" /> إعادة المحاولة
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return <div className="rounded-3xl border border-dashed border-border bg-card py-16 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة</div>;
  }
  return <>{children}</>;
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
        className="grid size-9 place-items-center rounded-lg border border-border bg-card disabled:opacity-40 hover:bg-accent">
        <ChevronRight className="size-4" />
      </button>
      <span className="text-xs font-bold text-muted-foreground">صفحة {page} من {pageCount}</span>
      <button onClick={() => onChange(Math.min(pageCount, page + 1))} disabled={page === pageCount}
        className="grid size-9 place-items-center rounded-lg border border-border bg-card disabled:opacity-40 hover:bg-accent">
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}

export const PAGE_SIZE = 10;
