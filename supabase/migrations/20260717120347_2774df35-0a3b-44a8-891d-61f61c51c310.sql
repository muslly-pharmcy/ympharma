-- Schedule nightly provider ranking refresh (03:15 UTC)
DO $$
DECLARE
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs';
BEGIN
  PERFORM cron.unschedule('ranking-tick-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='ranking-tick-nightly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'ranking-tick-nightly',
  '15 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ympharma.lovable.app/api/public/ai/ranking-tick',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs'
    ),
    body := '{}'::jsonb
  );
  $cron$
);