# TITANUS OMEGA X — Phoenix Rebuild · Deliverable 4
## Files to REBUILD
**Phase:** PHOENIX-P0 · **Date:** 2026-07-14

Legend: **MOVE** = same code, new location · **REFACTOR** = split into module shape · **REBUILD** = new implementation replacing legacy · **RETIRE** = deleted after parity gate.

---

## 1. Admin routes — 54 flat `admin-*.tsx` files (RETIRE after parity)

Consolidated into `src/routes/(admin)/<module>/*` thin wrappers, logic in `src/modules/<module>/`.

| Current route(s) | Target module | Verdict |
|---|---|---|
| `admin-hub`, `admin-command`, `admin-dashboard` | `administration` | REBUILD → single shell |
| `admin-ai-executive`, `admin-ai-executive-dashboard`, `admin-ai-orchestrator`, `admin-ai-copilot` | `ai-engine` + `administration` | REBUILD → merged copilot |
| `admin-agents`, `admin-agent-insights`, `admin-agent-runs`, `admin-automation-hub` | `ai-engine` | REBUILD |
| `admin-ai-catalog`, `admin-ai-excel-import`, `admin-ai-extractions`, `admin-ai-extraction-failures`, `admin-ai-inventory`, `admin-ai-loyalty`, `admin-ai-marketing`, `admin-ai-procurement`, `admin-ai-sales-cx`, `admin-ai-whatsapp`, `admin-ai-chronic-refill`, `admin-ai-approvals` | respective domain modules + `ai-engine` | REFACTOR |
| `admin-inventory`, `admin-inventory-duplicates`, `admin-inventory-sync-logs`, `admin-inventory-reservations`, `admin-stock-audit`, `admin-upload-inventory` | `inventory` / `warehouse` | REFACTOR |
| `admin-transfers`, `admin-branches` | `transfers` / `branches` | REFACTOR |
| `admin-products`, `admin-product-gallery`, `admin-classifications`, `admin-bundles`, `admin-pharmacy-recommendations` | `catalog` / `media-library` | REFACTOR |
| `admin-orders` (via tabs), `admin-rx-check`, `admin-rx-review`, `admin-rx-extraction-edit`, `admin-trigger-failures` | `orders` / `prescriptions` / `prescription-ai` | REFACTOR |
| `admin-marketing`, `admin-marketing-campaigns`, `admin-campaigns`, `admin-banners`, `admin-offers`, `admin-discounts`, `admin-social-posts`, `admin-loyalty-dashboard` | `marketing` / `cms` | REFACTOR |
| `admin-whatsapp-conversations`, `admin-whatsapp-delivery`, `admin-alert-settings`, `admin-slack-test`, `admin-hmac-preflight` | `notifications` / `api-gateway` | REFACTOR |
| `admin-cron-jobs`, `admin-cron-health`, `admin-logs`, `admin-diagnostics`, `admin-event-bus`, `admin-error-explainer`, `admin-health`, `admin-audit`, `admin-backups`, `admin-backup-verify`, `admin-workforce`, `admin-sales-reports`, `admin-settings` | `monitoring` / `audit` / `administration` | REFACTOR |
| `admin.tsx` | `administration` root layout | REBUILD |

**Deletion policy:** old file survives with a `redirect()` to new route until parity gate passes, then RETIRE.

## 2. Duplicated `_authenticated/admin-*` variants

- `_authenticated/admin-agent-runs.tsx`, `_authenticated/admin-ai-copilot.tsx`, `_authenticated/admin-alert-settings.tsx`, `_authenticated/admin-audit.tsx`, `_authenticated/admin-dashboard.tsx`, `_authenticated/admin-error-explainer.tsx`, `_authenticated/admin-health.tsx`, `_authenticated/admin-inventory-sync-logs.tsx`, `_authenticated/admin-marketing-campaigns.tsx`, `_authenticated/admin-sales-reports.tsx`, `_authenticated/admin-slack-test.tsx`, `_authenticated/admin-system-health.tsx`, `_authenticated/admin-upload-inventory.tsx`
  → **RETIRE** — merged with top-level counterparts under `(admin)` group.

## 3. AI public routes

- `ai-assistant.tsx`, `ai-pharmacist.tsx`, `ai-prescription.tsx`, `ai-supplement.tsx`, `ai-symptoms.tsx` → `modules/ai-engine/routes/*` behind unified `/ai/*` prefix. **REBUILD** for consistent UX (mobile-first, one input, streaming).

## 4. Public routes to rebuild

- `src/routes/index.tsx` — **REBUILD** homepage per UX requirements (3 CTAs, mobile-first).
- `src/routes/__root.tsx` — **REBUILD** shell with tenant provider + simplified head.
- `src/routes/prescription.tsx`, `_authenticated/upload-prescription.tsx` — **REFACTOR** into `modules/prescriptions/routes/upload.tsx` (single canonical entry, deep-linkable).
- `src/routes/cart.tsx`, `src/routes/track.tsx`, `src/routes/product.$id.tsx`, `src/routes/products.tsx`, `src/routes/bundles.tsx`, `src/routes/conditions.tsx`, `src/routes/conditions.$slug.tsx` → `modules/catalog` / `modules/orders`. **REFACTOR**.
- `src/routes/settings.tsx`, `src/routes/notifications.tsx`, `src/routes/my-notifications.tsx`, `src/routes/loyalty.tsx`, `src/routes/insurance.tsx` → `modules/customers` / `modules/notifications` / `modules/insurance`. **REFACTOR**.
- `src/routes/contact.tsx`, `src/routes/titans.tsx`, `src/routes/trust.tsx` → `modules/cms`. **MOVE**.
- `src/routes/status.tsx`, `src/routes/network-health.tsx`, `src/routes/network-test.tsx`, `src/routes/yemen-debug.tsx` → `modules/monitoring` (public status page kept, debug routes gated). **REFACTOR**.
- `src/routes/auth.tsx` → `modules/identity/routes/auth.tsx`. **MOVE**.

## 5. Pharmacist / doctor shells

- `_authenticated/pharmacist/dashboard.tsx` → `modules/administration` / new `modules/pharmacy-network`. **REFACTOR**.
- **NEW**: doctor shell (`modules/doctors/routes/*`), appointments, e-prescription QR — no legacy code, greenfield build.
- **NEW**: laboratories shell — greenfield.

## 6. `src/lib/**` — split by owner (RETIRE monolith)

Every file in `src/lib/` reassigned to a module. Examples:
- `src/lib/social-connectors/**` → `modules/marketing/adapters/social/**`.
- `src/lib/slack.functions.ts`, `src/lib/alert-dispatch.server.ts` → `modules/notifications/adapters/**`.
- `src/lib/monitoring/cron-monitor.ts`, `src/lib/notifications/slack-alerts.ts` → `modules/monitoring/**` / `modules/notifications/**`.
- `src/lib/upload-validation.functions.ts` → `modules/prescriptions/server/upload-validation.functions.ts`.
- `src/lib/health-check.server.ts` → `modules/monitoring/server/`.
- `src/lib/hourly-guard.ts`, `src/lib/retry.ts` → `platform/utils/`.
- `src/lib/email-templates/**` → `modules/notifications/email-templates/`.
- `src/lib/utils.ts` (cn) → `platform/ui-kit/utils.ts`.
- `src/lib/ai-*` → `modules/ai-engine/**`.

## 7. `src/hooks/**` — split by owner

- `use-session.ts` → `platform/tenant-context/hooks/`.
- `use-mobile.tsx`, `useMotionAnimation.ts`, `use-speech.ts` → `platform/ui-kit/hooks/`.
- `use-local-products.ts`, `use-merged-products.ts` → `modules/catalog/data/`.
- `use-logo-variant.ts` → `modules/cms/`.
- `use-voice-pharmacist.ts`, `use-whatsapp-agent.ts` → `modules/ai-engine/`.

## 8. `src/components/admin/**` — decomposed

- `EmailsTab`, `ErrorsTab`, `ImagesTab`, `InsuranceTab`, `OrdersTab`, `PrescriptionsTab*`, `RetentionTab`, `SecurityTab`, `StaffTab`, `TrustTab`, `CopilotPanels`, `RefreshAdminSession`, `admin-stats.tsx`, `admin/shared.tsx`, `admin/ui.tsx` → distributed into `modules/<owner>/ui/`. `AdminGate`, `InventoryAlerts` already listed in KEEP.

## 9. Other component-level rebuilds

- `src/components/site-chrome.tsx`, `src/components/dashboard-charts.tsx`, `src/components/marketing-banner.tsx`, `src/components/animated-section.tsx`, `src/components/bundle-performance.tsx`, `src/components/theme-toggle.tsx`, `src/components/ai-chat.tsx`, `src/components/ai-chat-widget.tsx` → moved into owning modules.

## 10. Router & startup

- `src/router.tsx`, `src/start.ts`, `src/server.ts` — **REFACTOR** minimally to register tenant provider + preserve existing bearer middleware.
- `src/styles.css` — **REFACTOR** into `platform/ui-kit/styles/` with tokens + module-scoped layers. Titans scope preserved.

---

## Summary

| Bucket | Count (approx.) |
|---|---:|
| Admin routes RETIRED (after parity) | 54 top-level + 13 authenticated variants = 67 |
| Public routes REFACTORED | ~24 |
| AI routes REBUILT | 5 public + 14 admin |
| `src/lib` files reassigned | all (~40+) |
| `src/hooks` files reassigned | 10 |
| `src/components` files reassigned | ~35 |
| Greenfield modules | `organizations`, `doctors`, `appointments`, `laboratories`, `pharmacy-network`, `catalog master`, `api-gateway`, `feature-flags` |
