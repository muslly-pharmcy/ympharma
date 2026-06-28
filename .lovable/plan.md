## SEC-P1-003 Batch 1.5 — Re-classify REVIEW_REQUIRED by name rules

**Scope:** Pure reclassification exercise. No SQL, no source changes, no PROJECT_STATE update.

### Inputs
- `docs/engineering/reports/SEC-P1-003-batch-1-classification.md` (existing 156-function table, 67 in REVIEW_REQUIRED bucket).

### Rules to apply (in order)
1. Name contains `_service_`, `_cron_`, `_internal_`, `_sync_`, `_trigger_`, `_maintenance_` → **SERVICE_ROLE_ONLY**
2. Name starts with `get_|search_|list_|select_|load_|fetch_|find_` → **KEEP_AUTHENTICATED**
3. Name starts with `set_|update_|delete_|remove_|create_|insert_|admin_|configure_|manage_` → **RESTRICT_ADMIN_ONLY**
4. Otherwise → remains **REVIEW_REQUIRED**

Note: rule 1 evaluated first so service-pattern names aren't swallowed by prefix rules.

### Steps
1. Parse the existing markdown table, extract the 67 REVIEW_REQUIRED rows.
2. Apply the rules above with a short Python script (no DB calls).
3. Regenerate `docs/engineering/reports/SEC-P1-003-batch-1-classification.md`:
   - Updated per-function table with new bucket column.
   - New bucket totals (KEEP_AUTHENTICATED / RESTRICT_ADMIN_ONLY / SERVICE_ROLE_ONLY / REVIEW_REQUIRED).
   - Dedicated section listing residual REVIEW_REQUIRED names for manual review.
   - Changelog note at top: "Batch 1.5 — name-based reclassification, no SQL applied."
4. Append a `CHANGELOG.md` entry noting the reclassification (docs-only).

### Out of scope
- No edits to `PROJECT_STATE.yaml`.
- No GRANT / REVOKE SQL.
- No code changes.
- No DB queries.

### Deliverable
Updated classification report + new bucket counts + residual REVIEW_REQUIRED list, ready for your review before Batch 2.
