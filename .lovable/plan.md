
# Phoenix Design System — Premium Healthcare UX

Most of the "Quick Execution — User Growth" block is already shipped in prior phases (Doctor Join at `/doctor/join`, homepage discovery grid + unified search, notification nudge, medicine + Arabic normalization, latest updates via `PlatformUpdates`). This plan focuses on the **new work** — the unified design system — and only re-touches growth surfaces to apply the new tokens/components.

## Scope

Presentation-layer only. No migrations, no RLS, no server-function changes, no schema changes. Business logic in `src/modules/**/server` and `src/platform/**` stays untouched.

## 1. Design tokens (src/styles.css)

Extend the existing `@theme` block with a **Muslly Medical** palette layered on top of current semantic tokens (so `bg-primary`, `text-foreground`, etc. keep working).

- Add tokens:
  - `--color-medical-turquoise: oklch(~0.68 0.12 200)` (≈ `#00A8B5`)
  - `--color-medical-turquoise-deep`, `--color-medical-turquoise-soft` (hover / tint)
  - `--color-medical-ink: oklch(~0.35 0 0)` (≈ `#4D4D4D`)
  - `--color-medical-surface: oklch(~0.98 0.005 220)` (≈ `#F4F7F8`)
  - `--color-medical-white: #FFFFFF`
  - `--shadow-medical-card`, `--shadow-medical-elevated`
  - `--radius-medical-card: 1rem`, `--radius-medical-pill: 999px`
- Map onto existing semantic tokens where sensible (no breaking change): keep current `--primary` but expose `--color-medical-*` as an additive layer used by the new components.
- Typography: load **Cairo** (Arabic) + **Montserrat** (Latin) via `<link>` in `src/routes/__root.tsx` (preconnect + stylesheet — never `@import` a URL in styles.css). Register `--font-arabic: "Cairo", ...` and `--font-latin: "Montserrat", ...` in `@theme`. Set body to `font-family: var(--font-arabic), var(--font-latin), system-ui`.
- Add `@utility` helpers: `medical-card`, `medical-pill`, `medical-focus-ring`, `medical-tap` (min 44px touch target).

## 2. Reusable components (new folder `src/components/medical/`)

Presentation-only wrappers. Each accepts props + `className`, uses tokens above, RTL-safe (`dir="rtl"` friendly, logical properties). No new data fetching — components render props passed by existing pages.

- `MedicalCard.tsx` — base card (surface, radius, shadow, hover lift).
- `DoctorCard.tsx` — thin re-skin wrapping the existing doctor data shape used in `src/modules/doctors/components/DoctorCard.tsx`. Keep the old component; new one is opt-in.
- `MedicineCard.tsx` — image + name (ar/en) + price + availability chip. Uses `ProductImage` from `product-intelligence`.
- `PharmacyCard.tsx` — name, city, "قريباً" badge variant.
- `TrustBadge.tsx` — verified / license / rating variants (re-uses semantics from existing `TrustBadge` if present; otherwise new).
- `HealthArticleCard.tsx` — for Sahtak education cards.
- `SearchBox.tsx` — visual shell around inputs; wraps existing `UnifiedSearch` styling without changing its logic.
- `EmptyState.tsx` — icon + title + description + optional CTA.
- `LoadingSkeleton.tsx` — shimmer primitives (`SkeletonLine`, `SkeletonCard`, `SkeletonAvatar`).

All components:
- Mobile-first, min 44px tap targets, focus-visible rings using `--color-medical-turquoise`.
- Use `content-visibility: auto` on list items where safe.
- No new deps. Animations use CSS transitions + existing `Reveal`/`CountUp` in `src/components/titans/motion/` when needed.

## 3. Apply to existing surfaces (visual only)

Swap presentation on:
- Homepage (`src/routes/index.tsx`) — Discovery Grid + Latest Updates + Search wrap use new tokens/components. Keep sections and copy identical.
- Doctors directory cards — render via new `DoctorCard` (behind a small feature swap in the list component). Old card kept as fallback.
- Products list card — apply `MedicineCard` skin.
- Sahtak (`/sahtak`) education cards — apply `HealthArticleCard`.

No route changes, no data-fetching changes, no server function edits.

## 4. Performance

- Lazy-load medical components via existing route-level lazy patterns.
- No new runtime libraries. Fonts: `display=swap`, `preconnect`, subset to `arabic,latin`.
- Verify build output size stays within current envelope (spot check `bun run build` locally is out of scope — rely on CI).

## 5. Deliverables

- Updated `src/styles.css` (+ tokens/utilities).
- Updated `src/routes/__root.tsx` head links (Cairo + Montserrat).
- New `src/components/medical/*` (8 files + `index.ts`).
- Minimal edits to `src/routes/index.tsx`, doctors list card wrapper, products card wrapper, sahtak card wrapper — presentation only.
- Report: `docs/engineering/reports/PHOENIX-DESIGN-SYSTEM.md` documenting tokens, component API, RTL rules, and where each is applied.

## Explicitly out of scope

- Any migration, RLS, admin import, schema change.
- Rewriting existing `titans/` components (kept as-is).
- Redesigning admin routes.
- Changing business logic in `src/modules/**/server` or `src/platform/**`.

## Technical notes

- Tailwind v4 tokens go in `@theme` in `src/styles.css`; custom utilities use `@utility` (no `@layer utilities`).
- Fonts loaded via `<link>` in `__root.tsx` `head()` — never `@import` a URL from styles.css.
- New components must not import from `*.server.ts` or `src/modules/**/server/*`.
- RTL: use logical properties (`ps-`/`pe-`, `ms-`/`me-`) and avoid hard-coded `left/right` in class names.
