-- Schedule marketing campaign webhooks via pg_cron.
-- The /api/public/* prefix bypasses edge auth; the route handlers verify the apikey header.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop any prior schedules with the same names (idempotent re-runs).
DO $$
BEGIN
  PERFORM cron.unschedule('run-reactivation-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('run-loyalty-reminder-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('run-restock-alerts-4h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 1) Reactivation — every Monday at 09:00 UTC
SELECT cron.schedule(
  'run-reactivation-weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://project--4d4aad01-9bf4-4d8b-acab-e51a06a17c63.lovable.app/api/public/hooks/run-reactivation',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 2) Loyalty reminder — every day at 10:00 UTC
SELECT cron.schedule(
  'run-loyalty-reminder-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4d4aad01-9bf4-4d8b-acab-e51a06a17c63.lovable.app/api/public/hooks/run-loyalty-reminder',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 3) Restock alerts — every 4 hours
SELECT cron.schedule(
  'run-restock-alerts-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4d4aad01-9bf4-4d8b-acab-e51a06a17c63.lovable.app/api/public/hooks/run-restock-alerts',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
