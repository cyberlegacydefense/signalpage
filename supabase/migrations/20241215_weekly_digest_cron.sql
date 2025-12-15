-- Weekly Digest Cron Job
-- Schedules the send-weekly-digest edge function to run daily at 9 AM UTC
-- The function itself checks which day users prefer and only sends on their chosen day

-- =============================================================================
-- ENABLE PG_CRON EXTENSION
-- =============================================================================

-- Note: pg_cron must be enabled in Supabase Dashboard under Database > Extensions
-- This extension may already be enabled if you're using other cron jobs

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user (required for cron jobs)
GRANT USAGE ON SCHEMA cron TO postgres;

-- =============================================================================
-- CREATE CRON JOB FOR WEEKLY DIGEST
-- =============================================================================

-- Schedule: Every day at 9:00 AM UTC
-- The edge function checks if it's the user's preferred day and only sends then
-- Running daily ensures users get their digest on their chosen day regardless of timezone

SELECT cron.schedule(
  'send-weekly-digest',           -- job name
  '0 9 * * *',                    -- cron expression: 9 AM UTC every day
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- =============================================================================
-- ALTERNATIVE: MANUAL TRIGGER FUNCTION
-- =============================================================================

-- This function can be called manually to trigger the weekly digest
-- Useful for testing or manual sends

CREATE OR REPLACE FUNCTION trigger_weekly_digest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    )::jsonb INTO result;

  RETURN result;
END;
$$;

-- =============================================================================
-- VIEW SCHEDULED JOBS
-- =============================================================================

-- To view scheduled jobs, run:
-- SELECT * FROM cron.job;

-- To view job run history, run:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =============================================================================
-- CLEANUP (if needed)
-- =============================================================================

-- To remove the cron job:
-- SELECT cron.unschedule('send-weekly-digest');

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. The edge function URL format is:
--    https://<project-ref>.supabase.co/functions/v1/send-weekly-digest
--
-- 2. You need to set the following secrets in Supabase:
--    - RESEND_API_KEY: Your Resend API key for sending emails
--
-- 3. The app.settings values should be configured in Supabase:
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://xxx.supabase.co';
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- 4. Alternatively, you can hardcode the URL in the cron job:
--    Replace current_setting calls with actual values
