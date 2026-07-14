# PHOENIX INVOICE INTELLIGENCE — Foundation Report

**Date:** 2026-07-14
**Status:** Foundation delivered
**Module:** `src/modules/invoice-intake/`

## Objective
Enable pharmacies/suppliers to add products by photographing supplier invoices.
The pipeline extracts line items via OCR + LLM, matches them against the existing
catalog through `product-intelligence`, and requires **human review** before any
stock is mutated.

## Pipeline
```
Camera / File
  → private bucket `invoice-uploads` (signed upload URL)
  → extractInvoice (Gemini 3 Flash Preview, multimodal image → JSON)
  → per-line matcher (search_medicines_public RPC — exact / alias / fuzzy)
  → invoice_extractions + invoice_line_items (status='pending')
  → Review UI (/_authenticated/pharmacist/invoice-review/$id)
  → commitInvoice → inv_receive_stock RPC (existing FEFO ledger)
  → invoice_audit_events (every transition)
```

## Schema (migration `20260714…`)
| Table | Purpose |
| --- | --- |
| `invoice_uploads` | one row per image (org, branch, supplier, storage path, status) |
| `invoice_extractions` | parsed header (supplier, invoice #, date, totals, OCR confidence, model) |
| `invoice_line_items` | per-line detected + matched + user-confirmed values, status |
| `invoice_audit_events` | append-only audit trail |

Bucket `invoice-uploads` is **private**; policies restrict read/write to
org members with `inventory.write`.

## RLS matrix
| Table | anon | authenticated read | authenticated write |
| --- | --- | --- | --- |
| `invoice_uploads` | ❌ | `is_org_member(org)` | `has_org_permission(inventory.write)` |
| `invoice_extractions` | ❌ | via parent upload org | via parent upload permission |
| `invoice_line_items` | ❌ | via extraction → upload org | via extraction → upload permission |
| `invoice_audit_events` | ❌ | via upload org | **service_role only** (server fns) |

Storage RLS enforces the same permission, keyed by first path segment (`<org_id>/`).

## Server functions
- `createInvoiceUpload` — inserts row, returns signed upload URL + token.
- `extractInvoice` — signs a 10-min read URL, calls Gemini 3 Flash Preview
  multimodally, parses JSON, persists header + lines, runs matcher per line.
- `getInvoiceForReview`, `listMyInvoices` — read helpers.
- `updateInvoiceLine` — per-line confirm / skip / edit.
- `commitInvoice` — verifies no line is `pending`, then calls
  `inv_receive_stock` per confirmed line. Rejects if any line is still pending.
- `cancelInvoiceUpload` — soft-cancel.

Every state transition writes an `invoice_audit_events` row via `supabaseAdmin`
(server-only, loaded via `await import` inside the handler per Phoenix rules).

## Matching thresholds
- Uses `search_medicines_public` RPC → exact / alias / fuzzy (Arabic normalised).
- `match_confidence ≥ 0.75` → autolabel as `exact | alias | fuzzy`.
- Below threshold → `unmatched`; UI forces manual product pick before confirming.

## AI model
- `google/gemini-3-flash-preview` via Lovable AI Gateway.
- System prompt supports **Arabic, English, mixed**.
- Reply-shape: strict JSON with header + `lines[]`; parser tolerates surrounding text.
- On failure the upload status flips to `failed` and an audit event is written.

## UI (mobile-first, RTL Arabic)
- `/pharmacist/invoice-upload` — camera-capture input (`capture="environment"`),
  44px tap targets, progress states.
- `/pharmacist/invoice-review/$id` — line-by-line editing, sticky commit bar
  disabled until every line is either confirmed or skipped.
- `/pharmacist/invoice-list` — org-scoped list, status badges, deep-link to review.

## Security
- Private storage bucket; no public read.
- Every write path is behind `requireSupabaseAuth` + `has_org_permission(inventory.write)`.
- Audit events are read-only for members; only server functions insert them.
- No `supabaseAdmin` in client bundles — every use is `await import()` inside handler.
- Line commit route uses the existing `inv_receive_stock` (SECURITY DEFINER)
  which re-checks `has_org_permission(inventory.write)` server-side — defence in depth.

## Explicit non-goals (this phase)
- No PDF ingestion (images only).
- No multi-page stitching.
- No auto-learning of supplier formats.
- No auto-price updates to `catalog_products` — invoices only affect stock/cost.
- **No auto-commit path** — human confirmation is mandatory.

## Next iterations
1. PDF + multi-page support.
2. Supplier-format learning loop (store per-supplier prompt hints).
3. Product picker combobox (currently accepts UUID) using
   `searchMedicinesIntelligent` client hook.
4. Auto-select current org/branch/warehouse from tenant context instead of
   asking the user to paste UUIDs.
5. Rate-limit `extractInvoice` per user via `rate_limit_buckets`.
