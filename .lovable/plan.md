## Note on `src/App.tsx`
Project is TanStack Start — no `App.tsx`. I'll adapt this blueprint into a **new file-based route** and reuse the existing `SovereignEngineDashboard` you already ship.

## What I'll build
Replace the current `/admin-sovereign` route with an expanded 8‑tab RTL command center matching your blueprint:

1. 🧠 المخ السيادي والـ 800 أداة → renders existing `<SovereignEngineDashboard />`
2. 🔥 الحميات والسعرات والتطبيبات → caloric calculator (weight × BMR × fever multiplier) + dengue/malaria/typhoid protocol cards
3. 🩺 قسم المريض المزمن → diabetes / hypertension / delivery cards
4. 💗 قسم الأمهات ورعاية الحوامل → trimester vitamins + WhatsApp subscription card
5. 👶 قسم الأطفال والرضع → paracetamol dose calculator (10–15 mg/kg → ml) + safety alerts
6. 👥 شبكة الأطباء والعيادات → verified doctor cards
7. ⚡ المكملات الغذائية → D3 / Omega-3 / Zinc cards
8. 🌿 الأعشاب الطبية → ginger / chamomile / black seed cards

All content, colors, gradients, calculators, and Arabic copy come verbatim from your blueprint.

## Fixes vs. the pasted code
- `Cpu` icon is used but not imported → add it to the lucide-react imports.
- Remove unused icon imports (`ShieldCheck`, `Globe`, `Code2`, `Award`, `BarChart3`, `Database`, `HelpCircle`, `Search`, `Plus`, `Sparkles`) to keep `tsgo` clean.
- `direction: rtl` + Tajawal already global via `__root.tsx` — no font work.
- Wrap in `AdminGate` so only admins can access, matching existing admin routes.

## Files
- **Edit**: `src/routes/_authenticated/admin-sovereign.tsx` — replace body with the 8‑tab sidebar layout (Brain/Fevers/Chronic/Maternal/Kids/Doctors/Supplements/Herbs). Preserves the route path so the existing `SovereignQuickLauncher` deep‑links (`?tab=maternal|doctors|suppliers`) keep working; I'll map `suppliers` → a new `supplements` alias-free by keeping current search-param names and adding `fevers`, `chronic`, `kids`, `herbs`.
- **Edit**: `src/components/sovereign-quick-launcher.tsx` — add the new tabs to the launcher list so all 8 are one‑tap reachable.

## Non-goals
- No backend changes.
- No changes to `SovereignEngineDashboard` internals — it's rendered as‑is on the Brain tab.
- No changes to the storefront, root layout, or other admin routes.