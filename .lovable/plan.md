## Problem
Lovable Cloud is already enabled and healthy, but the app throws `Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Connect Supabase in Lovable Cloud` on startup after an external GitHub commit (Jules, cbf8f5d) was synced. The `.env` file in the repo still contains the correct `VITE_SUPABASE_*` and `SUPABASE_*` values, so the issue is that the running dev server has not picked up the environment configuration.

## Plan

### 1. Restart the dev server to reload environment
The Vite dev server caches environment at startup. A GitHub sync can rewrite `.env` while the old process is still running, leaving `import.meta.env` empty for the client bundle.
- Kill the running `vite`/`bun run dev` process.
- Wait for the supervisor to respawn it.
- Verify `http://localhost:8080` responds.

### 2. Validate env injection after restart
- Open the preview and confirm the missing-env error is gone.
- Check browser console for any remaining Supabase initialization errors.
- If the error persists, inspect whether Vite is loading `.env` by checking `import.meta.env` in a temporary diagnostic route or console log.

### 3. Rebind Supabase secrets if env still missing
If the values in `.env` are not being injected into the server runtime, run `supabase--rebind_secrets` to refresh the sandbox binding for `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then restart again.

### 4. Add a startup guard for Cloud connectivity
To make future failures easier to diagnose, add a small env-validation step in `src/start.ts` (or a dedicated `src/lib/env-check.server.ts`) that:
- Verifies `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are present at build/dev time.
- Logs a clear, actionable message if they are missing.
- Does not leak the service role key or any secret values.

## Expected outcome
The app initializes the Supabase client successfully, the preview loads, and the user sees a clearer error if env vars are ever missing again.

## Notes
- No schema changes or migrations are needed; the backend is healthy.
- The publishable/anon key is already in `.env` and is safe to expose to the client; the service role key is server-only and must remain in runtime secrets only.