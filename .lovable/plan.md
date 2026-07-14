# PHOENIX QUAD-PHASE — Commerce, Notifications, AI Assistant, Security

Four foundations shipped in one execution batch. Each phase is
foundation-only: schemas, RPCs, module scaffolds, admin/read UIs where
useful. **No payment provider integration, no WhatsApp/SMS provider
activation, no LLM key changes.** Reports committed per phase.

---

## Phase A — Commerce & Revenue Engine

### Database (single migration)
- `billing_plans` — plan catalog. Fields: `code` (unique), `audience`
  (`pharmacy|doctor|supplier`), `tier` (`free|basic|premium|enterprise|
  professional`), `price_month_yer`, `price_year_yer`, `features jsonb`,
  `is_active`, `sort_order`.
- `billing_subscriptions` — active subscription per subject
  (`subject_type` = `pharmacy|doctor|supplier|organization`, `subject_id`),
  `plan_id`, `status` (`trialing|active|past_due|cancelled|expired`),
  `started_at`, `current_period_end`, `cancel_at_period_end`, `trial_ends_at`.
  Unique per (subject_type, subject_id, status='active').
- `billing_invoices` — one row per billing period (`subscription_id`,
  `amount_yer`, `currency`, `issued_at`, `due_at`, `paid_at`, `status`
  `draft|issued|paid|void|failed`, `external_ref` NULL for now).
- `billing_ledger` — append-only revenue ledger
  (`entry_type` `charge|refund|credit|adjustment`, `amount_yer`,
  `invoice_id`, `subject_type`, `subject_id`, `notes`, `created_by`).
- `billing_audit_events` — every plan/subscription/invoice mutation.
- **Insurance foundation:** `ins_companies` (name, code, logo_url, phone,
  is_active) and `ins_patient_coverage` (patient_id, company_id, policy_no,
  valid_from, valid_to, copay_percent, notes). Both org-scoped where
  applicable; anon read for active `ins_companies`.

### RPCs (SECURITY DEFINER)
- `billing_activate_plan(subject_type, subject_id, plan_code, trial_days?)`
- `billing_cancel_subscription(subscription_id, at_period_end)`
- `billing_issue_invoice(subscription_id, period_start, period_end)` —
  creates invoice + ledger `charge` entry (status `issued`, no payment).
- `billing_record_payment(invoice_id, amount_yer, notes)` — admin-only,
  marks paid + writes ledger.
- All wrapped by `billing_audit_events` inserts.

### Seed
- 4 pharmacy plans (Free / Basic / Premium / Enterprise).
- 2 doctor plans (Free profile / Professional).
- 2 supplier plans (Basic / Analytics).
- 3 sample insurance companies (public read).

### Module & UI
- `src/modules/billing/` — types, schemas, server functions
  (`listPlans`, `getMySubscription`, `activatePlan`, admin invoicing).
- `/pricing` public route showing all plan tiers with feature lists.
- `/admin-billing` (admin only) — subscription + invoice management.

### Report
`docs/engineering/reports/PHOENIX-COMMERCE.md`

---

## Phase B — Unified Notification Engine

### Database
- `notif_templates` — `code` (unique), `channel`
  (`whatsapp|sms|email|push|in_app`), `locale`, `subject`, `body`,
  `variables jsonb`, `is_active`.
- `notif_preferences` — per user: allowed channels, per-event opt-ins,
  quiet-hours.
- `notif_events` — enum of app events (`order.updated`,
  `medicine.availability`, `appointment.reminder`, `health.content`).
- `notif_dispatch` — one row per attempt. Fields: `user_id`, `channel`,
  `template_code`, `payload jsonb`, `status`
  (`pending|sent|failed|throttled|skipped`), `attempts`,
  `next_retry_at`, `provider_ref`, `error`.
- `notif_rate_limits` — per (user_id, channel, window) counters.
- `notif_audit_events` — every send + preference change.

### RPCs
- `notif_enqueue(user_id, event, payload)` — resolves preferences +
  templates, inserts `notif_dispatch` rows (status `pending`).
- `notif_mark_sent(dispatch_id, provider_ref)` /
  `notif_mark_failed(dispatch_id, error)` /
  `notif_schedule_retry(dispatch_id, backoff_seconds)` — with exponential
  backoff cap.
- `notif_check_rate_limit(user_id, channel)` — returns
  `{ allowed, retry_after_seconds }`.

### Dispatcher (foundation only)
- `src/modules/notifications/dispatcher.server.ts` — reads pending rows,
  calls per-channel adapters. **Adapters are stubs** that log intent and
  mark rows `sent`. No actual WhatsApp/SMS/Email API calls in this phase.
  `in_app` writes to existing `notifications` table.
- Public route `/api/public/notifications/tick` for scheduled polling
  (HMAC-verified with existing `CRON_SECRET`).

### UI
- `/settings/notifications` — user preferences (channels + event
  opt-ins).
- `/admin-notifications` — dispatch queue viewer + retry button.

### Report
`docs/engineering/reports/PHOENIX-NOTIFICATIONS.md`

---

## Phase C — AI Health Assistant

### Server functions
- `askHealthAssistant({ question, session_id })` — Lovable AI Gateway,
  `google/gemini-2.5-flash`.
- **Tools exposed:**
  1. `searchMedicine` → wraps existing `search_medicines_public`.
  2. `getSahtakArticle` → placeholder over `sahtak` route content
     (returns TODO stub until CMS wired).
  3. `findDoctor` → wraps existing `searchDoctorsPublic`.
  4. `appointmentGuidance` → static safe-message + doctor CTA.
- **Safety guardrails:**
  - Hard system prompt: "أنت مساعد صحي معلوماتي. لا تُشخّص ولا تصف
    علاجات. لا تستبدل الطبيب. ذكّر المستخدم بمراجعة طبيب مختص لأي شكوى."
  - Response post-processor injects safety banner on every reply.
  - `AISafetyGuard` (existing in `src/core/ai-safety/`) applied to
    input/output — PII redaction, injection detection.
  - Refusal template for diagnosis/prescription requests.

### Persistence
- `ai_assistant_sessions` (user_id, started_at, last_at, message_count).
- `ai_assistant_messages` (session_id, role, content, tool_calls jsonb,
  safety_flags jsonb).
- `ai_assistant_audit_events` — every unsafe-input flag.

### UI
- `/assistant` — chat UI with non-dismissible banner:
  "⚠️ معلومات صحية عامة — ليست بديلاً عن استشارة الطبيب."
- Rendered via react-markdown.

### Report
`docs/engineering/reports/PHOENIX-AI-ASSISTANT.md`

---

## Phase D — Security Hardening (audit + fixes)

### Audit scope (NO feature changes)
1. **Authentication** — verify managed `_authenticated` gate integrity;
   no per-route `beforeLoad` gates on public routes; `redirect_uri`
   safety.
2. **Authorization** — enumerate all `SECURITY DEFINER` RPCs added in
   phases A–C, confirm `SET search_path = public`, `REVOKE FROM PUBLIC`,
   explicit `GRANT` audience.
3. **RLS** — assert every new `public.*` table from A–C has: grants,
   RLS enabled, at least one policy, and no `USING (true)` on write ops
   (SELECT `USING (true)` allowed for public catalogs only).
4. **API security** — every `/api/public/*` route validates HMAC/CRON
   secret or is truly public-read.
5. **Rate limits** — `notif_check_rate_limit` used by dispatcher;
   assistant limited to N requests/minute/user via
   `notif_rate_limits`-style helper.
6. **Bot protection** — foundation only: add honeypot field + minimum
   submit-time check to `contact_messages` and assistant endpoint.
   Documented as insufficient; recommend Turnstile later.
7. **Secrets** — scan for hardcoded keys; confirm no service-role at
   module scope; confirm `LOVABLE_API_KEY` usage only via gateway.
8. **Audit logs** — verify every new mutation table has an audit trail
   (`*_audit_events`).

### Monitoring / alerts
- `security_incidents` (severity, source, summary, payload, resolved).
- Extend `alert-dispatch.server.ts` to route `security.*` events to
  admin subscribers.
- `/admin-security-dashboard` — recent incidents, rate-limit hits,
  audit-log tail.

### Report
`docs/engineering/reports/PHOENIX-SECURITY-HARDENING.md` — with
per-check pass/fix status and remaining-risk list (payment providers,
real WhatsApp/SMS, CAPTCHA).

---

## Execution order & safety
1. Migration A (billing + insurance).
2. Migration B (notifications).
3. Migration C (assistant persistence).
4. Migration D (security incidents).
5. Server functions + routes per phase, in the same order.
6. Reports written last, after typecheck passes.

## Explicit non-goals
- No Stripe/Paddle/local payment provider integration.
- No live WhatsApp/SMS/Email provider calls (adapters stubbed).
- No CAPTCHA/Turnstile keys added.
- No changes to existing `_authenticated/route.tsx`.
- No breaking changes to already-shipped Phoenix modules.

## Deliverables checklist
- [ ] 4 migrations approved & applied.
- [ ] 4 module folders under `src/modules/`.
- [ ] `/pricing`, `/assistant`, `/settings/notifications`,
      `/admin-billing`, `/admin-notifications`,
      `/admin-security-dashboard` routes.
- [ ] 4 reports under `docs/engineering/reports/`.
- [ ] `tsgo` passes clean.
