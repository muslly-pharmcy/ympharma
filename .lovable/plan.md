## Note on `src/App.tsx`
This project is TanStack Start (file-based routing). There is no `src/App.tsx` — the root shell lives in `src/routes/__root.tsx`. I'll wire the sidebar there instead so it applies globally.

## What I'll build

A one‑tap **Sovereign Quick Launcher**: a fixed floating button (bottom‑right, RTL‑aware) that opens a vertical sidebar sheet linking the 4 hubs.

Links:
1. 🧠 المخ والـ 800 أداة → `/admin-ai-brain`
2. 🤰 باقات الأمومة → `/admin-sovereign` (tab: maternal)
3. 🩺 شبكة الأطباء → `/admin-sovereign` (tab: doctors)
4. 🏭 الموردون والمخازن → `/admin-sovereign` (tab: suppliers)

Plus a shortcut to the unified `/admin-sovereign` command center at the top.

## Behavior
- Visible **only to admins** (uses existing `useIsAdmin`/role check; hidden for public visitors so it doesn't clutter the storefront).
- Fixed FAB, `z-50`, animated (framer‑motion), pulsing gold accent matching the golden‑mark brand.
- Opens a right‑side `Sheet` (RTL) with the 4 large touch targets, icons, Arabic labels, and active‑route highlight.
- Closes on navigation, on Escape, and on backdrop tap.
- Keyboard shortcut: `Ctrl/Cmd + K` toggles it.

## Files
- **New**: `src/components/sovereign-quick-launcher.tsx` — FAB + Sheet, uses existing shadcn `Sheet`, `Button`, lucide icons, `Link` from `@tanstack/react-router`, and current admin‑detection hook.
- **Edit**: `src/routes/__root.tsx` — mount `<SovereignQuickLauncher />` inside `RootComponent` next to `<AiChatWidget />`.

## Non-goals
- No changes to public site navigation, header, or storefront layout.
- No new routes or backend changes; purely a presentational shortcut over existing routes.
- The `/admin-sovereign` tabs already exist; the launcher just deep‑links to them (via a `?tab=` search param I'll read in that route if not already wired).