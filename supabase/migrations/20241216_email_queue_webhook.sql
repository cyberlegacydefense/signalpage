-- Email Queue Webhook Trigger
-- Sends new email_queue rows to Zapier for delivery via Zoho

-- =============================================================================
-- ENABLE HTTP EXTENSION
-- =============================================================================

-- pg_net allows making HTTP requests from PostgreSQL
-- Must be enabled in Supabase Dashboard: Database → Extensions → pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- WEBHOOK TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_zapier_email_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on pending emails
  IF NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://hooks.zapier.com/hooks/catch/24412806/uaqyk6y/',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'id', NEW.id,
        'to_email', NEW.to_email,
        'to_name', NEW.to_name,
        'subject', NEW.subject,
        'body_html', NEW.body_html,
        'body_text', NEW.body_text,
        'email_type', NEW.email_type,
        'created_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- CREATE TRIGGER
-- =============================================================================

-- Drop trigger if it exists (for idempotent migrations)
DROP TRIGGER IF EXISTS email_queue_zapier_webhook ON public.email_queue;

-- Create trigger on INSERT
CREATE TRIGGER email_queue_zapier_webhook
  AFTER INSERT ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_zapier_email_queue();

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. Make sure pg_net extension is enabled in Supabase Dashboard
--    Database → Extensions → Search "pg_net" → Enable
--
-- 2. The webhook sends these fields to Zapier:
--    - id: UUID of the email record
--    - to_email: Recipient email address
--    - to_name: Recipient name (optional)
--    - subject: Email subject line
--    - body_html: HTML email content
--    - body_text: Plain text email content
--    - email_type: Type of email (weekly_digest, etc.)
--    - created_at: Timestamp
--
-- 3. After Zapier sends the email, it should call back to mark as sent:
--    UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = '<id>'
