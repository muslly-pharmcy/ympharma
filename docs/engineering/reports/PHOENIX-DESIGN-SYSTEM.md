# Phoenix Design System — Premium Healthcare UX

**Status:** shipped v1 (presentation layer only)
**Scope:** additive tokens + reusable Muslly Medical components. No business logic,
schema, RLS, or server-function changes.

## 1. Design tokens (`src/styles.css`)

Added under existing `@theme inline` block — **additive**, existing `--primary`
tokens preserved so all current pages keep rendering unchanged.

| Token | Value | Purpose |
|---|---|---|
| `--color-medical-turquoise` | `oklch(0.68 0.11 200)` ≈ `#00A8B5` | Brand primary |
| `--color-medical-turquoise-deep` | `oklch(0.55 0.11 200)` | Hover / active |
| `--color-medical-turquoise-soft` | `oklch(0.94 0.03 200)` | Tint / chips |
| `--color-medical-ink` | `oklch(0.42 0 0)` ≈ `#4D4D4D` | Body text on cards |
| `--color-medical-surface` | `oklch(0.975 0.006 220)` ≈ `#F4F7F8` | Section background |
| `--color-medical-white` | `#FFFFFF` | Card surface |
| `--shadow-medical-card` / `-elevated` | color-mix on turquoise | Card depth |
| `--radius-medical-card` | `1rem` | Card corner |
| `--radius-medical-pill` | `9999px` | Chips / pills |

### Typography

- Arabic: **Cairo** (self-hosted via `@fontsource/cairo`)
- Latin: **Montserrat Variable** (self-hosted via `@fontsource-variable/montserrat`)
- `--font-arabic`, `--font-latin` exposed on `@theme`; `--font-sans` now resolves
  to Cairo → Tajawal → system.

Fonts are self-hosted — no Google Fonts CDN dependency (YemenNet blocks/throttles
`fonts.googleapis.com`). Existing Tajawal remains as fallback.

### New utilities

`@utility medical-card`, `medical-card-hover`, `medical-pill`,
`medical-focus-ring`, `medical-tap`, `medical-shimmer` (+ keyframes).

## 2. Reusable components (`src/components/medical/`)

All components are RTL-safe, mobile-first, and enforce ≥44px touch targets.

| Component | Purpose |
|---|---|
| `MedicalCard` | Base surface (padding, radius, shadow, optional hover lift). |
| `DoctorCard` | Photo + name + specialty + city + optional Verified / Rating. |
| `MedicineCard` | Product image, ar/en name, price, availability chip. |
| `PharmacyCard` | Pharmacy name + city + optional `قريباً` badge. |
| `HealthArticleCard` | Cover + title + excerpt + read minutes for Sahtak. |
| `TrustBadge` | `verified` / `licensed` / `rating` variants. |
| `SearchBox` | Presentation shell around a search input; parent owns nav. |
| `EmptyState` | Icon + title + description + optional action. |
| `SkeletonLine/Avatar/Card/Grid` | Shimmer primitives via `medical-shimmer`. |

Barrel: `import { DoctorCard, MedicineCard, TrustBadge } from "@/components/medical"`.

## 3. UX rules encoded

- `medical-tap` guarantees 44×44 minimum hit area.
- `medical-focus-ring` gives visible keyboard focus in brand turquoise.
- All cards use logical properties (`end-2`, `truncate`) — safe under `dir="rtl"`.
- Images: `loading="lazy" decoding="async"`.
- Animations: CSS transitions + one shimmer keyframe. No new JS libraries added.

## 4. Performance

- Zero new runtime deps beyond `@fontsource/cairo` + `@fontsource-variable/montserrat`
  (font files only, tree-shakeable per weight).
- Components have no side effects and no data fetching — safe to lazy-load with
  existing route splitting.
- Shimmer is pure CSS (`background-position` animation).

## 5. Application to existing surfaces

Adoption is **opt-in**. Existing pages continue to render with prior styling; new
surfaces should import from `@/components/medical`. Recommended next-step wiring
(non-blocking):

- Homepage Discovery Grid → wrap tiles in `MedicalCard`.
- `/doctors` list → swap card presentation to `DoctorCard`.
- `/products` list → swap to `MedicineCard`.
- `/sahtak` → swap to `HealthArticleCard`.
- Any list loading state → `SkeletonGrid`.

Because the swap is purely presentational, it can be done incrementally per
surface without touching queries or server functions.

## 6. Files touched

```
src/styles.css                                 (additive: tokens + utilities + font imports)
src/components/medical/MedicalCard.tsx         (new)
src/components/medical/DoctorCard.tsx          (new)
src/components/medical/MedicineCard.tsx        (new)
src/components/medical/PharmacyCard.tsx        (new)
src/components/medical/HealthArticleCard.tsx   (new)
src/components/medical/TrustBadge.tsx          (new)
src/components/medical/SearchBox.tsx           (new)
src/components/medical/EmptyState.tsx          (new)
src/components/medical/LoadingSkeleton.tsx     (new)
src/components/medical/index.ts                (new barrel)
docs/engineering/reports/PHOENIX-DESIGN-SYSTEM.md (this file)
package.json                                   (added @fontsource/cairo, @fontsource-variable/montserrat)
```

## 7. Out of scope (unchanged)

- No migrations, no RLS changes, no admin imports.
- `titans/` scope preserved as-is (dark luxe theme for `/titans`).
- Existing shadcn / semantic tokens (`--primary`, `--background`, …) untouched.
- No changes under `src/modules/**/server` or `src/platform/**`.
