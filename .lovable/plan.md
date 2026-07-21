# Track A + D — Reality-Adjusted Plan

Chief, I have to push back on the two snippets you pasted before we commit them. Then here is what I will actually build.

## What I am rejecting (and why)

**1. The pasted `Header.tsx` is broken.**
- Every JSX tag body is empty (`<motion.header>` / `<div>` open with no children). Copy-pasting it would render nothing and break the build.
- We already have a working `src/shared/components/Navbar.tsx` wired to `AuthContext`, `ThemeContext`, `AIContext`, sign-out flow, and a `/mission-control` link. Replacing it with a stub loses real functionality.
- The "teal snake" logo file was never actually uploaded in this session (no image asset in the codebase, no upload in this turn). I will not fabricate a logo path.

**2. The pasted `security-scanner.ts` is theater, not an audit.**
- It hard-codes 5 function names into an array and `console.log`s that each was "verified". It never opens a file, never parses AST, never checks middleware. It would give a green report even if every function was unprotected.
- A real audit belongs at build time (ripgrep over `src/lib/*.functions.ts`), not as a runtime function shipped to users.

## What I will build instead

### Track A — Enhance the existing Navbar (no rewrite)

Edit `src/shared/components/Navbar.tsx` only. Keep every current feature. Add a middle nav cluster (visible on `md:` and up, collapsed on mobile) with real routes we already ship:

| Label | Route | Icon |
|---|---|---|
| الدليل الطبي | `/medical-directory` | `Stethoscope` |
| هيئة الأدوية | `/sbdma-import` (admin gated by route) | `Database` |
| الكتالوج | `/catalog` | `Search` |
| السلة | `/cart` *(new tiny route, see below)* | `ShoppingCart` |

Cart badge count reads from `cart_items` via a small `useQuery` that calls existing `listCart` in `src/lib/cart.functions.ts` (already authenticated). No count shown when signed out.

**Logo:** until you upload the teal-snake artwork, keep the current gradient "م" mark. As soon as you drop the image into chat I will replace it in a one-line follow-up and swap the wordmark colors to match the logo's teal. No placeholder image will be invented.

### Track D — Real self-audit (build-time, not runtime)

Add `scripts/audit-server-fns.mjs` + `docs/engineering/SERVER-FN-AUDIT.md`:

- Script walks `src/lib/**/*.functions.ts`, parses each `createServerFn(...)` chain, and reports for every exported server fn:
  - Has `.middleware([requireSupabaseAuth])`? yes/no
  - Has `.inputValidator(...)`? yes/no
  - Method (GET/POST)
- Writes a Markdown table to `docs/engineering/SERVER-FN-AUDIT.md` with a summary line (`X/Y protected`) and lists any unauthenticated fns explicitly, so unprotected endpoints cannot hide behind a hard-coded whitelist.
- Runnable with `node scripts/audit-server-fns.mjs`; no runtime shipping, no fake dashboard.

Deliverable in this turn: the script, one generated report, and the doc.

## Out of scope this turn

- Tracks B (WhatsApp) and C (FB/IG autopilot) — I will not scaffold code paths for them until the keys land. Half-built social wiring would need to be reworked once we know which provider (Meta Cloud API vs UltraMsg) you actually pick.
- No `/settings` change, no `_authenticated` route changes, no DB migration.

## Confirm before I switch to build

Two quick decisions:
1. **Cart route** — OK to add a minimal `src/routes/_authenticated/cart.tsx` that lists `cart_items` (view only, remove-item button), so the navbar cart badge links somewhere real? Or skip the page and have the badge open a dropdown instead?
2. **Logo** — do you want to (a) ship the navbar update now with current "م" mark and swap the logo later, or (b) wait until you upload the teal-snake PNG so we do it in one shipment?
