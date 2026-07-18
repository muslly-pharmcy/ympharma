## P1 #1 — SECURITY DEFINER anon EXECUTE exposure

### Verification (read-only, just executed)

Live query against `pg_proc` / `has_function_privilege('anon', …, 'EXECUTE')` for every `SECURITY DEFINER` function in `public`:

```
pn_get_pharmacy_public
pn_list_pharmacy_products
pn_search_medicine_nearby
search_medicines_public
```

Exactly **4 rows**, and every one matches the intentional keep-list from `SECDEF-HARDENING-v2.md` (public catalog / pharmacy discovery reads used by anonymous visitors on `/find-care` and the medicine search box).

### Analysis

- Linter warnings (`SUPA_anon_security_definer_function_executable × 4`) are informational for these four — they are documented as anon-callable by design.
- No unexpected function is exposed to `anon`.
- All four are read-only, return only public catalog data, and have `search_path` pinned + `postgres` ownership (verified in the prior hardening report).

### Recommended action

**No code or SQL change.** The finding is already at its target state. To close it cleanly and stop it re-surfacing in future audits:

1. Add a short "accepted risk" note to `docs/engineering/reports/SECDEF-HARDENING-v2.md` listing the 4 keep-list functions with a one-line justification each.
2. Mark the 4 corresponding linter items as "ignored — intended" via `security--manage_security_finding` so the scanner stops flagging them (keeps the signal clean for real regressions).

That is the entire change for P1 #1 — pure documentation + scanner state, no DB migration, no code edits, no permission change.

### Validation plan

- Re-run the same `pg_proc` query after the note is added → expect the same 4 rows.
- Re-run `supabase--linter` → the 4 items should be gone from the active list once marked ignored.
- No TS / build / RPC surface touched, so no typecheck or runtime regression risk.

### After this

Stop and wait for approval before touching P1 #2 (`verifyCronSecret` vs `requireCronAuth` consolidation), per your "one finding at a time" rule.

### Files that would change

- `docs/engineering/reports/SECDEF-HARDENING-v2.md` (append "Accepted anon-exposed functions" subsection)
- Scanner state only (via `security--manage_security_finding`), no source files.

### Remaining risk for this finding

None beyond the accepted 4 public read helpers. Any future `SECURITY DEFINER` function added to `public` will re-trigger the linter unless it also lands on the documented keep-list, which is the desired behavior.
