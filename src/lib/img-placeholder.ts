// Tiny inline SVG used when an image fails to load (e.g. proxy blocked or
// upstream unavailable). Inline so it never makes a network request.
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="صورة غير متوفرة">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e6f7f2"/>
          <stop offset="100%" stop-color="#cfeee4"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <g fill="#0e8f7a" opacity="0.85">
        <path d="M200 120c-22 0-40 18-40 40s18 40 40 40 40-18 40-40-18-40-40-40zm0 16c13 0 24 11 24 24s-11 24-24 24-24-11-24-24 11-24 24-24z"/>
        <rect x="120" y="220" width="160" height="14" rx="7"/>
        <rect x="140" y="246" width="120" height="10" rx="5" opacity="0.7"/>
      </g>
      <text x="200" y="310" text-anchor="middle" font-family="Tajawal, Arial, sans-serif" font-size="22" font-weight="700" fill="#0e8f7a">صيدلية المصلي</text>
      <text x="200" y="338" text-anchor="middle" font-family="Tajawal, Arial, sans-serif" font-size="14" fill="#0e8f7a" opacity="0.75">صورة غير متوفرة</text>
    </svg>`,
  );

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallback === "1") return; // already swapped
  img.dataset.fallback = "1";
  img.src = IMAGE_PLACEHOLDER;
}
