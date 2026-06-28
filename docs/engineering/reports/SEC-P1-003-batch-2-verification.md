# SEC-P1-003 Batch 2 — Live Verification

**Applied:** 2026-06-28  
**Method:** `supabase--migration` (live DB)  
**Artifact:** `docs/engineering/artifacts/20260628053000_sec_p1_003_batch_2.sql`

## Verification Query

```sql
SELECT count(*)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = ANY(ARRAY[
    -- 5 RESTRICT_ADMIN_ONLY + 52 SERVICE_ROLE_ONLY
    'current_inventory_write_mode','exec_dashboard','handle_order_cancel_release',
    'inventory_report','release_order_stock', /* … 52 more … */
  ])
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
```

## Result

| Metric | Value |
|---|---|
| Functions targeted | 57 |
| Still EXECUTE-able by `authenticated` | **0** |
| Status | ✅ PASS |

All 57 SECURITY DEFINER functions are now inaccessible to the `authenticated` role at the DB level. `service_role` and `postgres` retain access; admin paths remain guarded application-side via `has_role(auth.uid(),'admin')`.
