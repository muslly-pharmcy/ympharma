## Sovereign Command Center — 4-Tab Admin Shell

Turn the pasted `App.tsx` shell into a proper route in this TanStack Start app.

### Where it lives
- New route: `src/routes/_authenticated/admin-sovereign.tsx` (admin-only, gated by the existing `_authenticated` layout + role check pattern used by other admin pages).
- No changes to `src/routes/__root.tsx` or the global layout.

### What I'll build
1. **Fix the bugs in the pasted JSX** before shipping:
   - Doctors button has a stray `</nav>` that closes the nav early — will restore correct tag order.
   - Wire `activeTab` state exactly as pasted (4 tabs: brain / maternal / doctors / suppliers).

2. **Tab content wiring:**
   - `brain` → renders existing `SovereignEngineDashboard` from `@/modules/ai-brain/components/SovereignEngineDashboard`.
   - `maternal` → `MaternalCarePortal` does NOT exist yet. I'll add a minimal placeholder component `src/modules/subscriptions/components/MaternalCarePortal.tsx` (static Arabic "Coming soon" card matching the dark theme) so the route compiles. Full portal is out of scope for this turn.
   - `doctors` and `suppliers` → static demo cards exactly as pasted (sample doctors + supplier KPIs).

3. **Admin gate:** on mount, verify the caller has `admin` or `owner` role via existing `has_role` RPC; non-admins see an Arabic "unauthorized" card. Same pattern already used in `/admin-*` routes.

4. **RTL + dark theme** preserved from the paste (`bg-slate-950`, `dir="rtl"`, gradient logo, lucide icons).

### Out of scope (say so explicitly)
- No new database tables, RPCs, or migrations.
- No real data for the doctors / suppliers tabs — they stay as the pasted mock cards. Wire real data in a follow-up turn.
- `MaternalCarePortal` is a placeholder only.

### Access
After build: navigate to `/admin-sovereign` while signed in as an admin.

Confirm and I'll implement.