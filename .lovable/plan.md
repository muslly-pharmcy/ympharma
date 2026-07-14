# PHOENIX INVOICE INTELLIGENCE ENGINE — Foundation Plan

## Objective
Let pharmacies/suppliers add products by uploading an invoice photo. Extract lines via OCR, match against the existing catalog (via `product-intelligence`), let a human review/edit, then commit through existing inventory RPCs. **No stock mutation without explicit confirmation.**

## Architecture (aligned with Phoenix modules)

```text
[Mobile Camera / File Upload]
        ↓ (signed upload)
[Storage bucket: invoice-uploads (private)]
        ↓
[createServerFn: extractInvoice]
        ↓
[Lovable AI Gateway: gemini-3-flash-preview (multimodal image → structured JSON)]
        ↓
[Line-item normalization + matching via product-intelligence.searchMedicinesIntelligent]
        ↓
[invoice_extractions table (status='pending_review')]
        ↓
[Review UI: /pharmacist/invoice-review/$id]
        ↓ (user confirms per-line: product_id, qty, cost, price, expiry, batch)
[createServerFn: commitInvoice → existing inv_stock_batches + inv_stock_movements RPCs]
        ↓
[Audit log: invoice_audit_events]
```

## Deliverables

### 1. Database (migration)
New module `src/modules/invoice-intake/`. Tables (with GRANT + RLS, org-scoped via `has_org_permission`):
- `invoice_uploads` — one row per uploaded image. Columns: `id`, `org_id`, `branch_id`, `uploaded_by`, `storage_path`, `mime_type`, `source` (`camera`|`file`), `status` (`uploaded`|`extracting`|`extracted`|`failed`|`committed`|`cancelled`), `supplier_id nullable`, `notes`, `created_at`.
- `invoice_extractions` — parsed header: `id`, `upload_id`, `supplier_name_raw`, `invoice_number`, `invoice_date`, `currency`, `subtotal`, `tax`, `total`, `ocr_confidence`, `raw_ocr_text`, `model_used`, `extracted_at`.
- `invoice_line_items` — one row per detected line: `id`, `extraction_id`, `line_no`, `raw_text`, `detected_name`, `detected_name_normalized`, `quantity`, `unit_cost`, `unit_price`, `expiry_date`, `batch_number`, `matched_product_id` (nullable FK `catalog_products`), `match_confidence`, `match_source` (`exact`|`alias`|`fuzzy`|`manual`|`unmatched`), `user_confirmed_product_id`, `user_confirmed_qty`, `user_confirmed_cost`, `user_confirmed_expiry`, `status` (`pending`|`confirmed`|`skipped`).
- `invoice_audit_events` — append-only: `id`, `upload_id`, `actor_user_id`, `event_type` (`uploaded`|`extraction_started`|`extraction_completed`|`extraction_failed`|`line_reviewed`|`committed`|`cancelled`), `payload jsonb`, `created_at`.

Storage: private bucket `invoice-uploads`, RLS: only org members can read their org's paths.

### 2. Server functions (`src/modules/invoice-intake/server/`)
- `uploadInvoice.functions.ts` — `createInvoiceUpload({ mime, source, branchId })` → returns signed upload URL + `upload_id`. Requires `requireSupabaseAuth`.
- `extract.functions.ts` — `extractInvoice({ uploadId })`:
  1. Load image from storage (signed URL, in-handler).
  2. Call Lovable AI Gateway with `google/gemini-3-flash-preview`, multimodal `image_url` input, JSON schema output (header + `line_items[]`). Supports Arabic + English + mixed supplier formats.
  3. For each line, run `product-intelligence.searchMedicinesIntelligent` (already handles Arabic normalization, aliases, fuzzy) → set `matched_product_id` + `match_source` + `match_confidence`.
  4. Persist to `invoice_extractions` + `invoice_line_items`. Emit audit event.
- `review.functions.ts` — `listPendingInvoices`, `getInvoiceForReview(id)`, `updateLineItem({ lineId, patch })`, `cancelInvoice(id)`.
- `commit.functions.ts` — `commitInvoice({ uploadId })`:
  - Guard: reject if any line still `pending` and not `skipped`.
  - For each confirmed line, call existing inventory RPCs (`inv_stock_batches` insert + `inv_stock_movements` type=`purchase`).
  - Set `invoice_uploads.status='committed'`. Audit event with per-line summary.

All privileged writes verify `has_org_permission(auth.uid(), org_id, 'inventory:write')`.

### 3. UI (mobile-first, Arabic RTL)
- `src/routes/_authenticated/pharmacist/invoice-upload.tsx` — camera-first uploader (`<input capture="environment" accept="image/*">`), drag-drop fallback, progress + status polling.
- `src/routes/_authenticated/pharmacist/invoice-review.$id.tsx` — review screen:
  - Header (supplier, invoice #, date, totals, OCR confidence badge).
  - Line grid: raw text | detected name | qty | cost | expiry | matched product (searchable combobox using `searchMedicinesIntelligent`) | confidence badge | actions (Confirm / Edit / Skip).
  - Sticky footer: "Confirm all & commit to stock" (disabled until every line is confirmed or skipped) + "Cancel".
- `src/routes/_authenticated/pharmacist/invoice-list.tsx` — list of the org's uploads with status filter.

Reuse `src/components/medical/*` primitives for consistency.

### 4. Product intelligence integration
- Extend `medicineNormalize.ts` only if new supplier abbreviations appear (no schema change).
- Route each `detected_name` through `searchMedicinesIntelligent`; take top result when `confidence ≥ 0.75`, otherwise mark `unmatched` and force manual pick.

### 5. Security & audit
- RLS on all four tables (org-scoped read/write; audit read-only for org admins).
- `invoice-uploads` bucket private; signed URLs only inside server handlers.
- Every state transition writes an `invoice_audit_events` row (who, what, when, payload).
- No client ever calls `supabaseAdmin`; commits use `requireSupabaseAuth` + `has_org_permission` gate.
- Rate-limit `extractInvoice` per user (reuse `rate_limit_buckets`, 10/hour).

### 6. Tests
- Unit: normalization of common supplier line formats (Arabic + English), confidence scoring thresholds.
- Server-fn happy path: mock Gemini response → verify extraction + matching → verify commit calls inventory RPCs exactly once per confirmed line.

### 7. Report
`docs/engineering/reports/PHOENIX-INVOICE-INTELLIGENCE.md` — schema, RPCs, RLS matrix, audit event catalog, matching thresholds, mobile UX notes, next steps (multi-page invoices, PDF, supplier-format learning loop).

## Explicit non-goals (this phase)
- No PDF ingestion (images only).
- No multi-page stitching.
- No automatic supplier learning / feedback loop.
- No price-list updates to `catalog_products` (invoice affects stock/cost only).
- No auto-commit path — human review is mandatory.

## Technical notes
- AI: `google/gemini-3-flash-preview` via existing `createLovableAiGatewayProvider` helper, `Output` structured schema (Zod). Multimodal `image_url` block with signed URL.
- Server-only imports (`supabaseAdmin`) stay inside handler bodies via `await import()` per Phoenix rules.
- `invoice-review.$id.tsx` lives under `_authenticated/pharmacist/` so the org gate + bearer middleware apply.
