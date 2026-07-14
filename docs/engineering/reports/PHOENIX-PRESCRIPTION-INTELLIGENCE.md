# PHOENIX PRESCRIPTION INTELLIGENCE — Foundation Report

**Status:** ✅ Foundation shipped
**Date:** 2026-07-14
**Scope:** Pharmacist-facing prescription review (OCR + AI interpretation surfaced for verification).

---

## What already existed

- **Upload workflow** — `src/routes/prescription.tsx` (customer camera/upload) → `src/lib/prescription-storage.functions.ts` (private `prescriptions` bucket).
- **OCR + AI extraction** — `src/lib/prescription-extractor.server.ts` writes `prescription_extractions` rows (medications, dosage, frequency, confidence, model tier).
- **Review state machine** — `src/lib/prescription-review.functions.ts` (assign / start / approve / reject / escalate) with DB-enforced transitions and audit via `activity_logs`.
- **Detail loader** — `getPrescriptionReviewDetail` returns review + files + extraction + escalations + unified timeline (`agent_events` ∪ `activity_logs` ∪ `escalations`).

## What this foundation adds

### Server functions (`src/lib/prescription-review.functions.ts`)

- **`getPrescriptionFileSignedUrl`** — admin/owner gated (`has_role` check). Signs a private `prescription_files` object for **10 minutes max, 1 hour ceiling**. Every call writes an `activity_logs` row with `action = "prescription_review.file_signed"` and the viewer id.
- **`savePrescriptionMatchedProducts`** — pharmacist records verified `catalog_products` matches per extracted line. Non-mutating — writes an audit trail only (no stock changes, no order creation).

### Pharmacist UI

- **`/pharmacist/prescription-queue`** — filter by state (`PENDING_REVIEW` / `ASSIGNED` / `IN_REVIEW` / `ESCALATED`), search by prescription id, shows correlation ref + customer.
- **`/pharmacist/prescription-review/:id`** — non-dismissible verification banner, signed-URL image opener, AI extraction lines with catalog picker (via `searchMedicinesIntelligent` → `search_medicines_public`), assign/start/approve/reject/escalate actions, timeline.

### Integration with other modules

| Module | Integration point |
|---|---|
| **Product intelligence** | Catalog picker uses `searchMedicinesIntelligent` (Arabic-normalized fuzzy search). |
| **Doctor / Patient** | Uses existing `prescriptions.customer_*` columns; no schema change. Future: link `prescriptions.patient_id` / `doctor_id` when those FK columns are added. |
| **Agent event bus** | State transitions emit `agent_events` via `emit_prescription_event` trigger; timeline stitches them by `correlation_id`. |

## Security & privacy

- **Private bucket** — `prescriptions` bucket is private; browser cannot read objects directly.
- **Short TTL** — signed URLs default to **600s**, hard cap 3600s. No long-lived URLs are ever returned to the pharmacist UI. (The legacy 1-year TTL in `src/lib/rx-url.ts` is not used by this path.)
- **Role gate** — `getPrescriptionFileSignedUrl` requires `admin` or `owner` role (no `pharmacist` role exists in the current `app_role` enum — grant via `admin`).
- **Audit trail** — every file view, every state transition, and every product match is written to `activity_logs` with `entity_type='prescription_review'` and `entity_id=<prescription_id>`.
- **RLS** — `prescription_reviews`, `prescription_extractions`, `prescription_files` all enforce staff-only reads via role check.
- **Non-dismissible banner** — every AI output on the review page shows "Requires pharmacist verification" in Arabic + English above the extraction block.

## Deferred (explicitly out of scope)

- Auto-creating an order from approved matches (write-side stock impact deferred; matches are audit-only for now).
- `pharmacist` role — not present in `app_role` enum; admins/owners have review permissions today.
- Bulk queue actions (assign many, batch escalate).
- Notification fan-out to on-call pharmacist on new `PENDING_REVIEW`.

## Files touched

- `src/lib/prescription-review.functions.ts` — appended 2 server functions.
- `src/routes/_authenticated/pharmacist/prescription-queue.tsx` — new.
- `src/routes/_authenticated/pharmacist/prescription-review.$id.tsx` — new.

**Foundation status:** ✅ Ready for pharmacist use in staging.
