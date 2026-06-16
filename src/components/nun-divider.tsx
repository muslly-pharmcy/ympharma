// Decorative divider inspired by the extended "ن" curve from the brand logo.
export function NunDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-2 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
      <svg width="56" height="20" viewBox="0 0 56 20" fill="none" className="shrink-0">
        <path
          d="M2 10 Q 14 -2, 28 10 T 54 10"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="text-primary"
          fill="none"
        />
        <circle cx="28" cy="14.5" r="1.8" className="fill-primary" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
