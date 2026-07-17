DO $$
BEGIN
  PERFORM cron.unschedule('ai-daily-business-report');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('security-daily-sweep');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'ai-daily-business-report',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4d4aad01-9bf4-4d8b-acab-e51a06a17c63.lovable.app/api/public/ai/business-tick',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'security-daily-sweep',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4d4aad01-9bf4-4d8b-acab-e51a06a17c63.lovable.app/api/public/security/sweep',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXFxbHBiamVtYXJ6emR4Y3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTUzMjUsImV4cCI6MjA5NzE5MTMyNX0.mLdBDNo4xYNMbRyO3YFqmEXHF1Mlaj6JTV_x-pernKs'
    ),
    body := '{}'::jsonb
  );
  $$
);