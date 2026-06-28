## Extract residual 63 REVIEW_REQUIRED function names

**Scope:** Read-only extraction. No SQL, no code, no PROJECT_STATE changes, no reclassification.

### Steps
1. Parse `docs/engineering/reports/SEC-P1-003-batch-1-classification.md` — Batch 1.5 "Residual REVIEW_REQUIRED" section.
2. Extract the 63 function names, sort alphabetically, names only.
3. Deliver as:
   - A markdown bullet list in the chat reply, AND
   - A new plain file `docs/engineering/reports/SEC-P1-003-review-required.txt` (one name per line) for easy reuse.

### Out of scope
- No edits to `PROJECT_STATE.yaml`.
- No edits to the classification report.
- No classification, no SQL, no source changes.
