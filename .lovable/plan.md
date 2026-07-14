## Context — what already exists

Both foundations were shipped in earlier turns; only the pharmacist-facing prescription review and cross-module wiring are missing. To avoid rework, this plan closes gaps rather than rebuilding.

**Invoice Intelligence (already delivered)**
- Tables: `invoice_uploads`, `invoice_extractions`, `invoice_line_items`, `invoice_audit_events` (RLS org-scoped, all present)
- Private bucket `invoice-uploads`
- Server fns in `src/modules/invoice-intake/functions/`: `upload`, `extract` (Gemini 3 Flash OCR), `review` (`updateInvoiceLine`, `commitInvoice` → `inv_receive_stock`)
- Mobile-friendly routes: `/pharmacist/invoice-upload`, `/pharmacist/invoice-review/$id`, `/pharmacist/invoice-list`
- Line matcher uses `search_medicines_public`; nothing writes stock until user confirms in review screen
- Report: `docs/engineering/reports/PHOENIX-INVOICE-INTELLIGENCE.md`

**Prescription Intelligence (partially delivered)**
- Tables: `prescription_files`, `prescription_extractions`, `prescription_reviews`, `prescription_escalations`, `prescription_orders` (RLS present)
- Public upload route `/prescription` (mobile camera, offline queue, compression)
- Extractor `src/lib/prescription-extractor.server.ts` (Gemini Flash → Pro escalation, confidence threshold 80, writes to `prescription_reviews`)
- Admin views `/admin-ai-extractions`, `/admin-ai-extraction-failures`
- **Missing**: pharmacist-facing review UI, medicine matching against product intelligence, explicit doctor/patient linkage on the review screen, "requires pharmacist verification" surfaced to end users

---

## Scope of this plan (foundation gaps only)

### A. Invoice Intelligence — verification + report refresh
1. Verify the three routes render and `commitInvoice` audit event lands in `invoice_audit_events` after a real click-through.
2. Add a `SECURITY / AUDIT` section to `docs/engineering/reports/PHOENIX-INVOICE-INTELLIGENCE.md` documenting: no-auto-stock rule, audit event names, RLS policies, and the confirmation gate.

No new tables, no new endpoints.

### B. Prescription Intelligence — pharmacist review layer
1. **New pharmacist route** `/pharmacist/prescription-review/$id` (under `_authenticated/pharmacist/`):
   - Signed-URL image viewer (reuses `RX_SIGNED_TTL_SECONDS`)
   - Extraction panel: medications (name, dose, frequency/duration), doctor, date, diagnosis, allergies, interactions
   - Each medication row calls `search_medicines_public` (product-intelligence layer) and lets pharmacist pick the matching canonical product or mark "not matched"
   - Persistent banner: **"يتطلب مراجعة صيدلي — Requires pharmacist verification"** (Arabic + English), non-dismissible
   - Approve / Request re-scan / Escalate actions write to `prescription_reviews`
2. **New pharmacist list** `/pharmacist/prescription-queue` — pending items from `prescription_reviews` (status = pending/review), org-scoped.
3. **Server fns** in `src/lib/prescription-review.functions.ts` (extend existing file):
   - `listPendingPrescriptionReviews` (auth-gated, RLS)
   - `getPrescriptionReviewDetail` (joins `prescription_extractions`, `prescription_files`, optional `hc_doctors` / `hc_patients` if linked)
   - `savePrescriptionReviewDecision({ id, status, matchedProducts, notes })` — no stock mutation, writes audit row into `prescription_reviews` and appends to `activity_logs`
4. **User-facing banner**: on `/prescription`, after upload success, show the same "Requires pharmacist verification — never a substitute for a doctor" line.
5. **Doctor / Patient module integration** (linkage only, no new tables): if the upload form has `patient_id` / `doctor_id` context (via signed-in user's `hc_patients` row or referral link), persist those FKs on `prescription_extractions` when the extractor writes its row. No schema change — columns already exist.
6. **Report**: create `docs/engineering/reports/PHOENIX-PRESCRIPTION-INTELLIGENCE.md` covering: pipeline (upload → OCR → Gemini → review), privacy (RLS, signed URLs, no PHI in logs), audit (`activity_logs` entries), pharmacist-verification gate, integration points.

### C. Security / privacy guardrails (both engines)
- Confirm RLS on `prescription_reviews` allows only `pharmacist` / `admin` roles via `has_role`.
- Ensure signed URLs for prescription images use existing TTL (`RX_SIGNED_TTL_SECONDS`), never public URLs.
- Log every pharmacist action in `activity_logs` with `entity='prescription_review'`.

---

## Technical details

**Files to create**
- `src/routes/_authenticated/pharmacist/prescription-review.$id.tsx`
- `src/routes/_authenticated/pharmacist/prescription-queue.tsx`
- `docs/engineering/reports/PHOENIX-PRESCRIPTION-INTELLIGENCE.md`

**Files to extend**
- `src/lib/prescription-review.functions.ts` — three new server fns above (all `requireSupabaseAuth` + `has_role` check)
- `src/routes/prescription.tsx` — add persistent verification banner after upload
- `docs/engineering/reports/PHOENIX-INVOICE-INTELLIGENCE.md` — Security/Audit section

**No changes** to: database schema, migrations, existing invoice code, extractor server file, cron jobs, RLS policies (verify only), dependencies.

**Rules honored**
- No auto-stock modification on invoice commit paths beyond the existing confirmation gate.
- Never displays prescription output without the "requires pharmacist verification" banner.
- All pharmacist decisions audited.
- Uses existing product-intelligence RPC for medicine matching (no duplicate normalizer).

---

## Out of scope (deferred)
- New medicine matching heuristics beyond `search_medicines_public`
- Doctor e-signature verification
- Insurance claim automation
- Real OCR benchmarks / load tests
- Any credit-spending model swap
